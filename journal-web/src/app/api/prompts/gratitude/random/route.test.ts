import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { GET } from "./route";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gratitudePrompt: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

const mockedSession = vi.mocked(getSessionUserId);
const mockedCount = vi.mocked(prisma.gratitudePrompt.count);
const mockedFindFirst = vi.mocked(prisma.gratitudePrompt.findFirst);

describe("GET /api/prompts/gratitude/random", () => {
  const mathRandom = Math.random;

  beforeEach(() => {
    vi.clearAllMocks();
    mockedSession.mockResolvedValue("user-1");
  });

  afterEach(() => {
    Math.random = mathRandom;
  });

  it("requires authentication", async () => {
    mockedSession.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/api/prompts/gratitude/random"));
    expect(response.status).toBe(401);
  });

  it("returns 404 when no prompts exist", async () => {
    mockedCount.mockResolvedValue(0);

    const response = await GET(new NextRequest("http://localhost/api/prompts/gratitude/random"));

    expect(response.status).toBe(404);
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("returns a random prompt when prompts exist", async () => {
    mockedCount.mockResolvedValue(5);
    mockedFindFirst.mockResolvedValue({
      id: "prompt-3",
      promptText: "Look for sunlight.",
    } as never);
    Math.random = vi.fn().mockReturnValue(0.4);

    const response = await GET(new NextRequest("http://localhost/api/prompts/gratitude/random"));
    const body = (await response.json()) as { prompt: { id: string; text: string } };

    expect(response.status).toBe(200);
    expect(body.prompt).toEqual({ id: "prompt-3", text: "Look for sunlight." });
    expect(mockedFindFirst).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      skip: 2,
    });
  });
});
