import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, PATCH } from "./route";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    gratitudePrompt: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockedSession = vi.mocked(getSessionUserId);
const mockedFindMany = vi.mocked(prisma.gratitudePrompt.findMany);
const mockedUpdate = vi.mocked(prisma.gratitudePrompt.update);

describe("/api/admin/prompts/gratitude", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication on GET", async () => {
    mockedSession.mockResolvedValue(null);

    const response = await GET(new NextRequest("http://localhost/api/admin/prompts/gratitude"));
    expect(response.status).toBe(401);
  });

  it("returns prompts with status", async () => {
    mockedSession.mockResolvedValue("user-1");
    mockedFindMany.mockResolvedValue([
      {
        id: "prompt-1",
        promptText: "Note a bright moment",
        isActive: true,
      },
    ] as never);

    const response = await GET(new NextRequest("http://localhost/api/admin/prompts/gratitude"));
    const body = (await response.json()) as {
      prompts: { id: string; text: string; isActive: boolean }[];
    };

    expect(response.status).toBe(200);
    expect(body.prompts).toEqual([
      { id: "prompt-1", text: "Note a bright moment", isActive: true },
    ]);
  });

  it("updates prompt activation", async () => {
    mockedSession.mockResolvedValue("user-2");
    mockedUpdate.mockResolvedValue({
      id: "prompt-9",
      promptText: "Sunlight check-in",
      isActive: false,
    } as never);

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/prompts/gratitude", {
        method: "PATCH",
        body: JSON.stringify({ id: "prompt-9", isActive: false }),
      }),
    );
    const body = (await response.json()) as {
      prompt: { id: string; text: string; isActive: boolean };
    };

    expect(response.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "prompt-9" },
      data: { isActive: false },
    });
    expect(body.prompt).toEqual({
      id: "prompt-9",
      text: "Sunlight check-in",
      isActive: false,
    });
  });
});
