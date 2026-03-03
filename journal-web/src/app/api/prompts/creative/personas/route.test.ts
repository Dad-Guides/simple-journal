import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET } from "./route";
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
  },
}));

const mockedSession = vi.mocked(getSessionUserId);
const mockedFindMany = vi.mocked(prisma.creativePersona.findMany);

describe("GET /api/prompts/creative/personas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    mockedSession.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/api/prompts/creative/personas"));
    expect(response.status).toBe(401);
  });

  it("returns active personas in order", async () => {
    mockedSession.mockResolvedValue("user-1");
    mockedFindMany.mockResolvedValue([
      {
        id: "persona-1",
        name: "Muse",
        description: "dreamy",
      },
    ] as never);

    const response = await GET(new NextRequest("http://localhost/api/prompts/creative/personas"));
    const body = (await response.json()) as {
      personas: { id: string; name: string; description: string }[];
    };

    expect(response.status).toBe(200);
    expect(mockedFindMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: [
        { order: "asc" },
        { createdAt: "asc" },
      ],
    });
    expect(body.personas).toEqual([
      {
        id: "persona-1",
        name: "Muse",
        description: "dreamy",
      },
    ]);
  });
});
