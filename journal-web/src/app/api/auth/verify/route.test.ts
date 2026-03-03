import { describe, it, expect, beforeEach, vi } from "vitest";
import argon2 from "argon2";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findFirst: vi.fn(),
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
const mockedSetSessionCookie = vi.mocked(setSessionCookie);
const mockedVerify = vi.mocked(argon2).verify;

describe("POST /api/auth/verify", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires a passcode value", async () => {
    const response = await POST(
      new Request("http://localhost/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedFindFirst).not.toHaveBeenCalled();
  });

  it("rejects when no stored passcode exists", async () => {
    mockedFindFirst.mockResolvedValue({
      id: "user-1",
      passcodeHash: null,
    } as never);

    const response = await POST(
      new Request("http://localhost/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ passcode: "1234" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mockedVerify).not.toHaveBeenCalled();
  });

  it("validates passcodes and sets the session cookie", async () => {
    mockedFindFirst.mockResolvedValue({
      id: "user-77",
      passcodeHash: "stored",
    } as never);
    mockedVerify.mockResolvedValue(true);

    const response = await POST(
      new Request("http://localhost/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ passcode: "1234" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockedVerify).toHaveBeenCalledWith("stored", "1234");
    expect(mockedSetSessionCookie).toHaveBeenCalledWith("user-77");
  });

  it("returns 401 when the passcode is invalid", async () => {
    mockedFindFirst.mockResolvedValue({
      id: "user-77",
      passcodeHash: "stored",
    } as never);
    mockedVerify.mockResolvedValue(false);

    const response = await POST(
      new Request("http://localhost/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({ passcode: "wrong" }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mockedSetSessionCookie).not.toHaveBeenCalled();
  });
});
