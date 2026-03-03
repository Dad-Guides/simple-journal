import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST } from "./route";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    creativePersona: {
      findMany: vi.fn(),
    },
    creativePrompt: {
      create: vi.fn(),
    },
  },
}));

const mockedSession = vi.mocked(getSessionUserId);
const mockedPersonaFindMany = vi.mocked(prisma.creativePersona.findMany);
const mockedPromptCreate = vi.mocked(prisma.creativePrompt.create);

describe("POST /api/prompts/creative", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue("user-1");
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires authentication", async () => {
    mockedSession.mockResolvedValue(null);

    const response = await POST(
      new NextRequest("http://localhost/api/prompts/creative", {
        method: "POST",
        body: JSON.stringify({ personaIds: [] }),
      }),
    );

    expect(response.status).toBe(401);
  });

  it("rejects when no personas are active/selected", async () => {
    mockedPersonaFindMany.mockResolvedValue([]);

    const response = await POST(
      new NextRequest("http://localhost/api/prompts/creative", {
        method: "POST",
        body: JSON.stringify({ personaIds: [] }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedPromptCreate).not.toHaveBeenCalled();
  });

  it("generates a prompt via Ollama when personas are available", async () => {
    mockedPersonaFindMany.mockResolvedValue([
      {
        id: "persona-1",
        name: "Muse",
        description: "dreamy voice",
      },
    ] as never);
    mockedPromptCreate.mockResolvedValue({
      id: "prompt-1",
      promptText: "Write about stardust.",
    } as never);
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ response: "Write about stardust." }),
    });

    const response = await POST(
      new NextRequest("http://localhost/api/prompts/creative", {
        method: "POST",
        body: JSON.stringify({ personaIds: ["persona-1"], seedText: "stardust" }),
      }),
    );
    const body = (await response.json()) as {
      prompt: { id: string; text: string; fromOllama: boolean };
    };

    expect(response.status).toBe(201);
    expect(mockedPersonaFindMany).toHaveBeenCalledWith({
      where: { isActive: true, id: { in: ["persona-1"] } },
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" },
      ],
    });
    expect(fetchMock).toHaveBeenCalled();
    expect(mockedPromptCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          promptText: "Write about stardust.",
        }),
      }),
    );
    expect(body.prompt).toEqual({
      id: "prompt-1",
      text: "Write about stardust.",
      fromOllama: true,
      personas: [
        {
          id: "persona-1",
          name: "Muse",
          description: "dreamy voice",
        },
      ],
    });
  });

  it("falls back when Ollama fails and still stores a prompt", async () => {
    mockedPersonaFindMany.mockResolvedValue([
      {
        id: "persona-2",
        name: "Journalist",
        description: "observant",
      },
    ] as never);
    mockedPromptCreate.mockResolvedValue({
      id: "prompt-2",
      promptText: "Fallback prompt.",
    } as never);
    fetchMock.mockRejectedValue(new Error("offline"));

    const response = await POST(
      new NextRequest("http://localhost/api/prompts/creative", {
        method: "POST",
        body: JSON.stringify({ personaIds: ["persona-2"] }),
      }),
    );
    const body = (await response.json()) as {
      prompt: { id: string; text: string; fromOllama: boolean };
    };

    expect(response.status).toBe(202);
    expect(mockedPromptCreate).toHaveBeenCalled();
    const savedPromptText =
      mockedPromptCreate.mock.calls[0]?.[0]?.data?.promptText ?? "";
    expect(savedPromptText).toContain("Journalist");
    expect(body.prompt.fromOllama).toBe(false);
  });
});
