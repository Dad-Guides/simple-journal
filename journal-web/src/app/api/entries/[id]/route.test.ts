import { EntryType } from "@prisma/client";
import { NextRequest } from "next/server";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    journalEntry: {
      findUnique: vi.fn(),
    },
  },
}));

const mockedSession = vi.mocked(getSessionUserId);
const mockedFindUnique = vi.mocked(prisma.journalEntry.findUnique);

describe("GET /api/entries/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the requested entry for the current user", async () => {
    mockedSession.mockResolvedValue("user-123");
    const entry = {
      id: "entry-1",
      userId: "user-123",
      entryType: EntryType.ANGER,
      title: "🤬 001",
      bodyMarkdown: "text",
      angerReason: "because",
      gratitudePromptId: null,
      creativePromptId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      gratitudePrompt: null,
      creativePrompt: null,
    };
    mockedFindUnique.mockResolvedValue(entry as never);

    const request = new Request("http://localhost/api/entries/entry-1");
    const response = await GET(new NextRequest(request), {
      params: Promise.resolve({ id: "entry-1" }),
    });
    const body = (await response.json()) as { entry?: typeof entry };

    expect(response.status).toBe(200);
    expect(body.entry?.id).toBe("entry-1");
    expect(mockedFindUnique).toHaveBeenCalledWith({
      where: { id: "entry-1" },
      include: {
        gratitudePrompt: true,
        creativePrompt: true,
      },
    });
  });

  it("returns 401 when session is missing", async () => {
    mockedSession.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/entries/entry-2"),
      { params: Promise.resolve({ id: "entry-2" }) },
    );

    expect(response.status).toBe(401);
    expect(mockedFindUnique).not.toHaveBeenCalled();
  });

  it("returns 404 when entry belongs to different user", async () => {
    mockedSession.mockResolvedValue("user-123");
    mockedFindUnique.mockResolvedValue({
      id: "entry-9",
      userId: "other-user",
      entryType: EntryType.GRATITUDE,
      title: "🥰 001",
      bodyMarkdown: "body",
      angerReason: null,
      gratitudePromptId: null,
      creativePromptId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      gratitudePrompt: null,
      creativePrompt: null,
    } as never);

    const response = await GET(new NextRequest("http://localhost/api/entries/entry-9"), {
      params: Promise.resolve({ id: "entry-9" }),
    });

    expect(response.status).toBe(404);
  });
});
