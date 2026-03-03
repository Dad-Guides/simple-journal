import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { EntryType } from "@prisma/client";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 10;
const ENTRY_TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

type EntriesPageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

type EntryWithRelations = Prisma.JournalEntryGetPayload<{
  include: {
    gratitudePrompt: true;
    creativePrompt: true;
  };
}>;

const ENTRY_EMOJI: Record<EntryType, string> = {
  [EntryType.ANGER]: "🤬",
  [EntryType.GRATITUDE]: "🥰",
  [EntryType.CREATIVE]: "✍️",
};

export const dynamic = "force-dynamic";

export default async function EntriesPage({ searchParams }: EntriesPageProps) {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const pageParam = toNumberParam(searchParams?.page);
  const currentPage = Math.max(1, pageParam ?? 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId },
      include: {
        gratitudePrompt: true,
        creativePrompt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.journalEntry.count({ where: { userId } }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rangeStart = total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = total === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, total);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-bold text-[--foreground]">
          All Entries
        </h1>
        <p className="text-base text-[--muted]">
          Page {currentPage} of {totalPages} · Showing{" "}
          {total === 0 ? "0 entries" : `${rangeStart}–${rangeEnd} of ${total}`}
        </p>
      </header>

      <ArchiveList entries={entries} />

      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        hasEntries={entries.length > 0}
      />
    </div>
  );
}

function ArchiveList({ entries }: { entries: EntryWithRelations[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-[--border-soft] bg-[--surface] p-12 text-center">
        <p className="text-sm font-medium text-[--muted]">No journal entries saved yet.</p>
        <Link href="/" className="mt-4 inline-block rounded-lg bg-[--accent] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[--accent-strong]">
          Write your first entry
        </Link>
      </div>
    );
  }

  return (
    <ul className="space-y-4">
      {entries.map((entry) => {
        const emoji = ENTRY_EMOJI[entry.entryType] ?? "📝";
        return (
          <li key={entry.id}>
            <Link
              href={`/entries/${entry.id}`}
              className="group block rounded-xl border border-[--border-soft] bg-[--surface] p-4 transition-all hover:border-[--accent]/50 hover:bg-[--accent-soft]"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold text-[--foreground]">
                  {emoji} {entry.title}
                </span>
                <span className="text-xs font-medium text-[--muted]">
                  {ENTRY_TIME_FORMATTER.format(entry.createdAt)}
                </span>
              </div>
              <p className="mt-2 text-sm text-[--muted]">{entrySnippet(entry)}</p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function PaginationBar({
  currentPage,
  totalPages,
  hasEntries,
}: {
  currentPage: number;
  totalPages: number;
  hasEntries: boolean;
}) {
  if (!hasEntries || totalPages <= 1) {
    return null;
  }

  const prevPage = currentPage > 1 ? currentPage - 1 : null;
  const nextPage = currentPage < totalPages ? currentPage + 1 : null;

  return (
    <div className="flex justify-center gap-4 pt-4">
      <PageButton label="← Previous" page={prevPage} disabled={!prevPage} />
      <PageButton label="Next →" page={nextPage} disabled={!nextPage} />
    </div>
  );
}

function PageButton({
  label,
  page,
  disabled,
}: {
  label: string;
  page: number | null;
  disabled: boolean;
}) {
  const commonClasses = "rounded-lg px-4 py-2 text-sm font-semibold transition";

  if (disabled || !page) {
    return (
      <span className={`${commonClasses} cursor-not-allowed border border-[--border-soft] bg-[--panel] text-[--muted]`}>
        {label}
      </span>
    );
  }

  const targetHref =
    page > 1
      ? {
          pathname: "/entries" as const,
          query: { page: page.toString() },
        }
      : {
          pathname: "/entries" as const,
        };

  return (
    <Link
      href={targetHref}
      className={`${commonClasses} border border-[--border-soft] bg-[--surface] text-[--foreground] hover:bg-[--accent-soft] hover:border-[--accent]/20`}
    >
      {label}
    </Link>
  );
}

function entrySnippet(entry: EntryWithRelations) {
  const trimmed = entry.bodyMarkdown?.trim() ?? "";
  if (trimmed.length > 0) {
    return trimmed.length > 160 ? `${trimmed.slice(0, 160)}…` : trimmed;
  }
  if (entry.entryType === EntryType.ANGER && entry.angerReason) {
    return entry.angerReason;
  }
  if (entry.entryType === EntryType.GRATITUDE && entry.gratitudePrompt?.promptText) {
    return entry.gratitudePrompt.promptText;
  }
  if (entry.entryType === EntryType.CREATIVE && entry.creativePrompt?.promptText) {
    return entry.creativePrompt.promptText;
  }
  return "No additional text provided.";
}

function toNumberParam(value: string | string[] | undefined): number | null {
  if (Array.isArray(value)) {
    return toNumberParam(value[0]);
  }
  if (!value) {
    return null;
  }
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

