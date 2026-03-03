import { EntryType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const ENTRY_EMOJI: Record<EntryType, string> = {
  [EntryType.ANGER]: "🤬",
  [EntryType.GRATITUDE]: "🥰",
  [EntryType.CREATIVE]: "✍️",
};

export const ENTRY_SLUG_TO_ENUM: Record<string, EntryType> = {
  anger: EntryType.ANGER,
  gratitude: EntryType.GRATITUDE,
  creative: EntryType.CREATIVE,
};

export async function nextEntryTitle(entryType: EntryType) {
  const counterRecord = await prisma.entryCounter.upsert({
    where: { entryType },
    create: { entryType, counter: 1 },
    update: { counter: { increment: 1 } },
  });

  const formatted = counterRecord.counter.toString().padStart(3, "0");
  return `${ENTRY_EMOJI[entryType]} ${formatted}`;
}
