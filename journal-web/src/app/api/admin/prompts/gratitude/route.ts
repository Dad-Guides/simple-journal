import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prompts = await prisma.gratitudePrompt.findMany({
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    prompts: prompts.map((prompt) => ({
      id: prompt.id,
      text: prompt.promptText,
      isActive: prompt.isActive,
    })),
  });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    isActive?: boolean;
  };

  if (!body.id || typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "id and isActive are required." },
      { status: 400 },
    );
  }

  const updatedPrompt = await prisma.gratitudePrompt.update({
    where: { id: body.id },
    data: { isActive: body.isActive },
  });

  return NextResponse.json({
    prompt: {
      id: updatedPrompt.id,
      text: updatedPrompt.promptText,
      isActive: updatedPrompt.isActive,
    },
  });
}
