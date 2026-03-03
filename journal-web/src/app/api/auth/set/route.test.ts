import { describe, it, expect, beforeEach, vi } from "vitest";
import argon2 from "argon2";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  setSessionCookie: vi.fn(),
}));

vi.mock("argon2", () => ({
  default: {
    hash: vi.fn(),
    verify: vi.fn(),
  },
}));

const mockedFindFirst = vi.mocked(prisma.user.findFirst);
const mockedCreate = vi.mocked(prisma.user.create);
const mockedUpdate = vi.mocked(prisma.user.update);
const mockedSetSessionCookie = vi.mocked(setSessionCookie);
const mockedHash = vi.mocked(argon2).hash;

describe("POST /api/auth/set", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects requests without a passcode", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/set", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("prevents overriding an existing passcode", async () => {
    mockedFindFirst.mockResolvedValue({
      id: "user-1",
      passcodeHash: "hash",
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/set", {
        method: "POST",
        body: JSON.stringify({ passcode: "secret" }),
      }),
    );

    expect(response.status).toBe(409);
    expect(mockedHash).not.toHaveBeenCalled();
    expect(mockedCreate).not.toHaveBeenCalled();
  });

  it("creates a new hashed passcode and sets a session cookie", async () => {
    mockedFindFirst.mockResolvedValue(null);
    mockedHash.mockResolvedValue("new-hash");
    mockedCreate.mockResolvedValue({ id: "user-99" } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/set", {
        method: "POST",
        body: JSON.stringify({ passcode: "1234" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedHash).toHaveBeenCalledWith("1234");
    expect(mockedCreate).toHaveBeenCalledWith({
      data: { passcodeHash: "new-hash" },
    });
    expect(mockedUpdate).not.toHaveBeenCalled();
    expect(mockedSetSessionCookie).toHaveBeenCalledWith("user-99");
  });
});
