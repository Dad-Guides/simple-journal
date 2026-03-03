import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const personas = await prisma.creativePersona.findMany({
    where: { isActive: true },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
    ],
  });

  return NextResponse.json({
    personas: personas.map((persona) => ({
      id: persona.id,
      name: persona.name,
      description: persona.description,
    })),
  });
}
