import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const personas = await prisma.creativePersona.findMany({
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
      isActive: persona.isActive,
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

  const updatedPersona = await prisma.creativePersona.update({
    where: { id: body.id },
    data: { isActive: body.isActive },
  });

  return NextResponse.json({
    persona: {
      id: updatedPersona.id,
      name: updatedPersona.name,
      description: updatedPersona.description,
      isActive: updatedPersona.isActive,
    },
  });
}
