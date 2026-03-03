import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/auth";

export async function GET() {
  const [user, sessionUserId] = await Promise.all([
    prisma.user.findFirst(),
    getSessionUserId(),
  ]);

  const hasPasscode = Boolean(user?.passcodeHash);
  const authenticated = Boolean(sessionUserId);

  return NextResponse.json({
    authenticated,
    hasPasscode,
  });
}
