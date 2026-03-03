import { EntryType } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";
import { ENTRY_SLUG_TO_ENUM, nextEntryTitle } from "@/lib/journal";

const PAGE_SIZE_DEFAULT = 10;
const PAGE_SIZE_MAX = 50;

interface CreateEntryPayload {
  entryType?: string;
  bodyMarkdown?: string;
  angerReason?: string | null;
  gratitudePromptId?: string | null;
  creativePromptId?: string | null;
}

function normalizePageSize(value: number | null | undefined) {
  if (!value || Number.isNaN(value)) {
    return PAGE_SIZE_DEFAULT;
  }
  return Math.min(Math.max(value, 1), PAGE_SIZE_MAX);
}

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = normalizePageSize(
    Number.parseInt(searchParams.get("pageSize") ?? "", 10),
  );
  const skip = (page - 1) * pageSize;

  const [entries, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { userId },
      include: {
        gratitudePrompt: true,
        creativePrompt: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.journalEntry.count({ where: { userId } }),
  ]);

  return NextResponse.json({
    entries,
    meta: {
      page,
      pageSize,
      total,
    },
  });
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as CreateEntryPayload;
  const entryTypeSlug = body.entryType?.toLowerCase();
  const entryType = entryTypeSlug
    ? ENTRY_SLUG_TO_ENUM[entryTypeSlug]
    : undefined;

  if (!entryType) {
    return NextResponse.json(
      { error: "entryType must be anger, gratitude, or creative." },
      { status: 400 },
    );
  }

  const title = await nextEntryTitle(entryType);

  const angerReason =
    entryType === EntryType.ANGER && typeof body.angerReason === "string"
      ? body.angerReason.trim()
      : null;
  const bodyMarkdown =
    typeof body.bodyMarkdown === "string" ? body.bodyMarkdown : "";
  const gratitudePromptId =
    entryType === EntryType.GRATITUDE && body.gratitudePromptId
      ? body.gratitudePromptId
      : null;
  const creativePromptId =
    entryType === EntryType.CREATIVE && body.creativePromptId
      ? body.creativePromptId
      : null;

  const journalEntry = await prisma.journalEntry.create({
    data: {
      userId,
      entryType,
      title,
      bodyMarkdown,
      angerReason,
      gratitudePromptId,
      creativePromptId,
    },
    include: {
      gratitudePrompt: true,
      creativePrompt: true,
    },
  });

  return NextResponse.json({ entry: journalEntry }, { status: 201 });
}
