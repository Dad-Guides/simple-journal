import argon2 from "argon2";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

interface VerifyPayload {
  passcode?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as VerifyPayload;
  const passcode = body.passcode?.trim();

  if (!passcode) {
    return NextResponse.json(
      { error: "Passcode is required." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findFirst();

  if (!user || !user.passcodeHash) {
    return NextResponse.json(
      { error: "Passcode not configured. Use /api/auth/set first." },
      { status: 400 },
    );
  }

  const isValid = await argon2.verify(user.passcodeHash, passcode);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid passcode." }, { status: 401 });
  }

  await setSessionCookie(user.id);

  return NextResponse.json({ success: true });
}
