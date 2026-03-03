"use server";

import type { ReactNode } from "react";
import { EntryType } from "@prisma/client";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type EntryDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const DETAIL_FORMATTER = new Intl.DateTimeFormat(undefined, {
  dateStyle: "long",
  timeStyle: "short",
});

export default async function EntryDetailPage({ params }: EntryDetailPageProps) {
  const { id } = await params;
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/");
  }

  const entry = await prisma.journalEntry.findFirst({
    where: { id, userId },
    include: {
      gratitudePrompt: true,
      creativePrompt: true,
    },
  });

  if (!entry) {
    notFound();
  }

  const personaList = extractPersonas(entry.creativePrompt?.personasUsed);
  const entryColor =
    entry.entryType === EntryType.ANGER
      ? "var(--anger)"
      : entry.entryType === EntryType.GRATITUDE
        ? "var(--gratitude)"
        : "var(--creative)";

  return (
    <main className="mx-auto w-full max-w-3xl space-y-8">
      <header className="space-y-4">
        <div className="flex items-center justify-between">
           <Link href="/entries" className="text-sm font-semibold text-[--accent] hover:text-[--accent-strong]">
            ← All Entries
          </Link>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: entryColor }}
          >
            {entryTypeLabel(entry.entryType)}
          </span>
        </div>
        
        <div className="space-y-1">
          <h1 className="text-4xl font-bold tracking-tight text-[--foreground]">{entry.title}</h1>
          <p className="text-sm font-medium text-[--muted]">
            {DETAIL_FORMATTER.format(entry.createdAt)}
          </p>
        </div>
      </header>

      {entry.entryType === EntryType.ANGER && entry.angerReason ? (
        <Callout color="var(--anger)">
          “I am angry because I care about {entry.angerReason}.”
        </Callout>
      ) : null}

      {entry.entryType === EntryType.GRATITUDE && entry.gratitudePrompt ? (
        <Callout color="var(--gratitude)">
          {entry.gratitudePrompt.promptText}
        </Callout>
      ) : null}

      {entry.entryType === EntryType.CREATIVE && entry.creativePrompt ? (
         <Callout color="var(--creative)">
            <div className="space-y-2">
              <p>{entry.creativePrompt.promptText}</p>
               {personaList.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-2">
                  {personaList.map((persona) => (
                    <span
                      key={`${persona.id ?? persona.name}`}
                      className="rounded-full bg-[--creative]/10 px-3 py-1 text-xs font-semibold text-[--creative]"
                    >
                      {persona.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </Callout>
      ) : null}

      <section className="prose prose-lg dark:prose-invert max-w-none">
        {entry.bodyMarkdown.trim() ? (
          <MarkdownView content={entry.bodyMarkdown} />
        ) : (
          <p className="text-base text-[--muted]">No additional text recorded.</p>
        )}
      </section>
    </main>
  );
}

function entryTypeLabel(entryType: EntryType) {
  switch (entryType) {
    case EntryType.ANGER:
      return "Anger";
    case EntryType.GRATITUDE:
      return "Gratitude";
    case EntryType.CREATIVE:
      return "Creative";
    default:
      return entryType;
  }
}

function extractPersonas(data: unknown) {
  if (!Array.isArray(data)) {
    return [];
  }
  return data
    .map((value) => {
      if (typeof value === "object" && value !== null) {
        const possible = value as { id?: string; name?: string };
        if (typeof possible.name === "string") {
          return possible;
        }
      }
      return null;
    })
    .filter((value): value is { id?: string; name: string } => value !== null);
}

function Callout({ color, children }: { color: string, children: ReactNode }) {
  return (
    <div 
      className="rounded-xl border-l-4 p-4"
      style={{
        borderColor: color,
        backgroundColor: `${color.slice(0, -1)}, 0.05)`, // Create a transparent version of the color
      }}
    >
      <p className="text-base font-medium text-[--foreground]">{children}</p>
    </div>
  );
}

type MarkdownViewProps = {
  content: string;
};

const CodeBlock = ({
  inline,
  className,
  children,
  ...props
}: {
  inline?: boolean;
  className?: string;
  children?: ReactNode;
}) => {
  const match = /language-(\w+)/.exec(className || "");
  return !inline && match ? (
      <pre className="rounded-lg bg-gray-900 p-4 my-6 overflow-x-auto" {...props}>
        <code className="text-gray-100">{children}</code>
      </pre>
  ) : (
    <code 
      className="rounded-md bg-[--panel] px-1.5 py-1 font-mono text-sm font-semibold text-[--foreground]" 
      {...props}
    >
      {children}
    </code>
  );
};

const MARKDOWN_COMPONENTS: Components = {
    h1: ({ ...props }) => <h1 className="font-bold tracking-tight text-[--foreground]" {...props} />,
    h2: ({ ...props }) => <h2 className="font-bold tracking-tight text-[--foreground] border-b border-[--border-soft] pb-2" {...props} />,
    h3: ({ ...props }) => <h3 className="font-bold tracking-tight text-[--foreground]" {...props} />,
    h4: ({ ...props }) => <h4 className="font-bold tracking-tight text-[--foreground]" {...props} />,
    p: ({ ...props }) => <p className="leading-7 [&:not(:first-child)]:mt-6" {...props} />,
    a: ({ ...props }) => <a className="font-medium text-[--accent] underline underline-offset-4" {...props} />,
    blockquote: ({ ...props }) => <blockquote className="mt-6 border-l-2 border-[--border-soft] pl-6 italic text-[--muted]" {...props} />,
    ul: ({ ...props }) => <ul className="my-6 ml-6 list-disc [&>li]:mt-2" {...props} />,
    ol: ({ ...props }) => <ol className="my-6 ml-6 list-decimal [&>li]:mt-2" {...props} />,
    li: ({ ...props }) => <li {...props} />,
    code: CodeBlock,
    hr: () => <hr className="my-4 md:my-8" />,
    table: ({ ...props }) => <div className="my-6 w-full overflow-y-auto rounded-lg border border-[--border-soft]"><table className="w-full" {...props} /></div>,
    thead: ({ ...props }) => <thead className="bg-[--panel]" {...props} />,
    tr: ({ ...props }) => <tr className="m-0 border-t border-[--border-soft] p-0 even:bg-[--panel]" {...props} />,
    th: ({ ...props }) => <th className="border border-[--border-soft] px-4 py-2 text-left font-bold [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
    td: ({ ...props }) => <td className="border border-[--border-soft] px-4 py-2 text-left [&[align=center]]:text-center [&[align=right]]:text-right" {...props} />,
};


function MarkdownView({ content }: MarkdownViewProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={MARKDOWN_COMPONENTS}
    >
      {content}
    </ReactMarkdown>
  );
}
