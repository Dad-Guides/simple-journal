import { EntryType } from "@prisma/client";
import { NextRequest } from "next/server";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { GET, POST } from "./route";
import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as journal from "@/lib/journal";

vi.mock("@/lib/auth", () => ({
  getSessionUserId: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    journalEntry: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const mockedSession = vi.mocked(getSessionUserId);
const mockedFindMany = vi.mocked(prisma.journalEntry.findMany);
const mockedCount = vi.mocked(prisma.journalEntry.count);
const mockedCreate = vi.mocked(prisma.journalEntry.create);

describe("/api/entries route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("requires authentication", async () => {
      mockedSession.mockResolvedValue(null);
      const response = await GET(new NextRequest("http://localhost/api/entries"));
      expect(response.status).toBe(401);
    });

    it("returns paginated entries for the authenticated user", async () => {
      mockedSession.mockResolvedValue("user-1");
      const entry = {
        id: "entry-1",
        userId: "user-1",
        entryType: EntryType.ANGER,
        title: "🤬 001",
        bodyMarkdown: "hello",
        angerReason: "because",
        gratitudePromptId: null,
        creativePromptId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        gratitudePrompt: null,
        creativePrompt: null,
      };
      mockedFindMany.mockResolvedValue([entry] as never);
      mockedCount.mockResolvedValue(11);

      const request = new NextRequest("http://localhost/api/entries?page=2&pageSize=5");
      const response = await GET(request);
      const body = (await response.json()) as {
        entries: typeof entry[];
        meta: { page: number; pageSize: number; total: number };
      };

      expect(response.status).toBe(200);
      expect(body.entries).toHaveLength(1);
      expect(body.meta).toEqual({ page: 2, pageSize: 5, total: 11 });
      expect(mockedFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1" },
          skip: 5,
          take: 5,
        }),
      );
    });
  });

  describe("POST", () => {
    const mockedNextEntryTitle = vi.spyOn(journal, "nextEntryTitle");

    beforeEach(() => {
      mockedNextEntryTitle.mockResolvedValue("🤬 999");
    });

    it("requires authentication for creation", async () => {
      mockedSession.mockResolvedValue(null);

      const response = await POST(
        new NextRequest("http://localhost/api/entries", {
          method: "POST",
          body: JSON.stringify({ entryType: "anger" }),
        }),
      );

      expect(response.status).toBe(401);
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it("rejects unknown entry types", async () => {
      mockedSession.mockResolvedValue("user-1");

      const response = await POST(
        new NextRequest("http://localhost/api/entries", {
          method: "POST",
          body: JSON.stringify({ entryType: "unknown" }),
        }),
      );

      expect(response.status).toBe(400);
      expect(mockedCreate).not.toHaveBeenCalled();
    });

    it("creates an anger entry and returns the saved record", async () => {
      mockedSession.mockResolvedValue("user-5");
      const createdEntry = {
        id: "entry-55",
        userId: "user-5",
        entryType: EntryType.ANGER,
        title: "🤬 999",
        bodyMarkdown: "",
        angerReason: "boundaries",
        gratitudePromptId: null,
        creativePromptId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        gratitudePrompt: null,
        creativePrompt: null,
      };
      mockedCreate.mockResolvedValue(createdEntry as never);

      const response = await POST(
        new NextRequest("http://localhost/api/entries", {
          method: "POST",
          body: JSON.stringify({
            entryType: "anger",
            angerReason: "boundaries ",
            bodyMarkdown: "text",
          }),
        }),
      );
      const body = (await response.json()) as { entry: typeof createdEntry };

      expect(response.status).toBe(201);
      expect(mockedNextEntryTitle).toHaveBeenCalledWith(EntryType.ANGER);
      expect(mockedCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-5",
          entryType: EntryType.ANGER,
          title: "🤬 999",
          angerReason: "boundaries",
          bodyMarkdown: "text",
          gratitudePromptId: null,
          creativePromptId: null,
        },
        include: {
          gratitudePrompt: true,
          creativePrompt: true,
        },
      });
      expect(body.entry.id).toBe("entry-55");
    });
  });
});
