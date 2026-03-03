import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "mistral:latest";
const DEFAULT_OLLAMA_URL =
  process.env.OLLAMA_URL ?? "http://ollama.tailnet.local:11434";

type CreativePromptPayload = {
  personaIds?: string[];
  seedText?: string;
};

type OllamaResult =
  | { ok: true; text: string; raw: unknown }
  | { ok: false; text: string; raw: unknown; reason: string };

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => ({}))) as CreativePromptPayload;
  const personaIds = Array.isArray(payload.personaIds)
    ? payload.personaIds.filter((value) => typeof value === "string" && value.trim().length > 0)
    : [];
  const seedText =
    typeof payload.seedText === "string" ? payload.seedText.trim() : "";

  const personas = await prisma.creativePersona.findMany({
    where: {
      isActive: true,
      ...(personaIds.length > 0 ? { id: { in: personaIds } } : {}),
    },
    orderBy: [
      { order: "asc" },
      { createdAt: "asc" },
    ],
  });

  if (personas.length === 0) {
    return NextResponse.json(
      { error: "Select at least one persona before generating a prompt." },
      { status: 400 },
    );
  }

  const personasSummary = personas
    .map((persona) => `${persona.name}: ${persona.description}`)
    .join("\n");
  const generatorPrompt = buildGeneratorPrompt(personasSummary, seedText);
  const ollamaResult = await generateViaOllama(generatorPrompt);

  const finalText =
    ollamaResult.ok && ollamaResult.text.trim().length > 0
      ? sanitizePromptText(ollamaResult.text)
      : buildFallbackPrompt(
          personas.map((persona) => ({ name: persona.name, description: persona.description })),
          seedText,
        );

  const personasUsed = personas.map((persona) => ({
    id: persona.id,
    name: persona.name,
    description: persona.description,
  }));

  const aiRaw: Prisma.InputJsonValue = {
    request: {
      personas: personasUsed,
      seedText,
      prompt: generatorPrompt,
      model: DEFAULT_OLLAMA_MODEL,
    },
    response: (ollamaResult.raw ?? null) as Prisma.InputJsonValue,
    usedFallback: !ollamaResult.ok,
  };

  const promptRecord = await prisma.creativePrompt.create({
    data: {
      personasUsed,
      promptText: finalText,
      aiRaw,
    },
  });

  return NextResponse.json(
    {
      prompt: {
        id: promptRecord.id,
        text: promptRecord.promptText,
        personas: personasUsed,
        fromOllama: ollamaResult.ok,
      },
    },
    { status: ollamaResult.ok ? 201 : 202 },
  );
}

function buildGeneratorPrompt(personaSummary: string, seedText: string) {
  const base =
    "You are an internal creative writing prompt generator. " +
    "Blend the following personas into one cohesive narrative voice:\n";
  const personaBlock = personaSummary
    .split("\n")
    .map((line) => `- ${line}`)
    .join("\n");

  const seed = seedText
    ? `Incorporate this seed idea or tone: "${seedText}".`
    : "Invent a scenario rooted in ordinary life that can bend toward wonder.";

  const instructions =
    "Return exactly one prompt. Do not label sections. " +
    "Keep it under 120 words, use second person, and emphasize sensory detail.";

  return `${base}${personaBlock}\n\n${seed}\n${instructions}\nReturn plain text without Markdown bullets or titles.`;
}

async function generateViaOllama(prompt: string): Promise<OllamaResult> {
  if (!DEFAULT_OLLAMA_URL) {
    return {
      ok: false,
      text: "",
      raw: { error: "OLLAMA_URL is not configured." },
      reason: "missing_url",
    };
  }

  const endpoint = new URL("/api/generate", DEFAULT_OLLAMA_URL);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: DEFAULT_OLLAMA_MODEL,
        prompt,
        stream: false,
      }),
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const reason =
        (data && typeof data.error === "string" && data.error) ||
        `Ollama responded with ${response.status}`;
      return {
        ok: false,
        text: "",
        raw: data ?? { error: reason },
        reason,
      };
    }

    const text =
      data && typeof data.response === "string" ? data.response : "";
    if (!text.trim()) {
      return {
        ok: false,
        text: "",
        raw: data ?? { error: "Empty response from Ollama." },
        reason: "empty_response",
      };
    }

    return { ok: true, text, raw: data };
  } catch (error) {
    return {
      ok: false,
      text: "",
      raw: {
        error:
          error instanceof Error ? error.message : "Unknown Ollama network error.",
      },
      reason: "network_error",
    };
  }
}

function buildFallbackPrompt(
  personas: { name: string; description: string }[],
  seedText: string,
) {
  const personaNames = personas.map((persona) => persona.name).join(", ");
  const seed =
    seedText.length > 0
      ? ` weaving in the seed “${seedText}”.`
      : " discovering surprise in an otherwise ordinary day.";

  return `Write a ${personaNames} inspired vignette${seed} Focus on texture, scent, and tiny gestures so the writer can expand it later.`;
}

function sanitizePromptText(text: string) {
  return text.replace(/\r\n/g, "\n").trim();
}
