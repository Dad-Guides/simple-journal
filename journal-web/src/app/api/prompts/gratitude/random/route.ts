import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activeCount = await prisma.gratitudePrompt.count({
    where: { isActive: true },
  });

  if (activeCount === 0) {
    return NextResponse.json(
      { error: "No gratitude prompts available." },
      { status: 404 },
    );
  }

  const skip = Math.floor(Math.random() * activeCount);
  const prompt = await prisma.gratitudePrompt.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    skip,
  });

  if (!prompt) {
    return NextResponse.json(
      { error: "Failed to pick a gratitude prompt." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    prompt: {
      id: prompt.id,
      text: prompt.promptText,
    },
  });
}
