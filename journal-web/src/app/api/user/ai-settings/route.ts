import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findFirst({ where: { id: userId } });

  return NextResponse.json({
    aiBaseUrl: user?.aiBaseUrl ?? null,
    aiModel: user?.aiModel ?? null,
    aiApiKey: user?.aiApiKey ?? null,
  });
}

export async function PATCH(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    aiBaseUrl?: string | null;
    aiModel?: string | null;
    aiApiKey?: string | null;
  };

  const data: { aiBaseUrl?: string | null; aiModel?: string | null; aiApiKey?: string | null } = {};
  if ("aiBaseUrl" in body) data.aiBaseUrl = body.aiBaseUrl || null;
  if ("aiModel" in body) data.aiModel = body.aiModel || null;
  if ("aiApiKey" in body) data.aiApiKey = body.aiApiKey || null;

  const user = await prisma.user.update({ where: { id: userId }, data });

  return NextResponse.json({
    aiBaseUrl: user.aiBaseUrl ?? null,
    aiModel: user.aiModel ?? null,
    aiApiKey: user.aiApiKey ?? null,
  });
}
