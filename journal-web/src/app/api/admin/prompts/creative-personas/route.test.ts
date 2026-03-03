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
    creativePersona: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

const mockedSession = vi.mocked(getSessionUserId);
const mockedFindMany = vi.mocked(prisma.creativePersona.findMany);
const mockedUpdate = vi.mocked(prisma.creativePersona.update);

describe("/api/admin/prompts/creative-personas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication", async () => {
    mockedSession.mockResolvedValue(null);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/prompts/creative-personas"),
    );
    expect(response.status).toBe(401);
  });

  it("returns persona listing", async () => {
    mockedSession.mockResolvedValue("user-1");
    mockedFindMany.mockResolvedValue([
      {
        id: "persona-1",
        name: "Observer",
        description: "details focused",
        isActive: true,
      },
    ] as never);

    const response = await GET(
      new NextRequest("http://localhost/api/admin/prompts/creative-personas"),
    );
    const body = (await response.json()) as {
      personas: { id: string; name: string; description: string; isActive: boolean }[];
    };

    expect(body.personas).toEqual([
      {
        id: "persona-1",
        name: "Observer",
        description: "details focused",
        isActive: true,
      },
    ]);
  });

  it("toggles persona activation", async () => {
    mockedSession.mockResolvedValue("user-2");
    mockedUpdate.mockResolvedValue({
      id: "persona-5",
      name: "Muse",
      description: "dreamy",
      isActive: false,
    } as never);

    const response = await PATCH(
      new NextRequest("http://localhost/api/admin/prompts/creative-personas", {
        method: "PATCH",
        body: JSON.stringify({ id: "persona-5", isActive: false }),
      }),
    );
    const body = (await response.json()) as {
      persona: { id: string; isActive: boolean };
    };

    expect(response.status).toBe(200);
    expect(mockedUpdate).toHaveBeenCalledWith({
      where: { id: "persona-5" },
      data: { isActive: false },
    });
    expect(body.persona).toMatchObject({ id: "persona-5", isActive: false });
  });
});
