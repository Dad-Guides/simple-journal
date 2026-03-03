import argon2 from "argon2";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSessionCookie } from "@/lib/auth";

interface PasscodePayload {
  passcode?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as PasscodePayload;
  const passcode = body.passcode?.trim();

  if (!passcode) {
    return NextResponse.json(
      { error: "Passcode is required." },
      { status: 400 },
    );
  }

  if (passcode.length < 4 || passcode.length > 128) {
    return NextResponse.json(
      { error: "Passcode must be between 4 and 128 characters." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findFirst();
  if (existingUser?.passcodeHash) {
    return NextResponse.json(
      { error: "Passcode already set. Use /api/auth/verify." },
      { status: 409 },
    );
  }

  const passcodeHash = await argon2.hash(passcode);
  const user =
    existingUser !== null
      ? await prisma.user.update({
          where: { id: existingUser.id },
          data: { passcodeHash },
        })
      : await prisma.user.create({
          data: { passcodeHash },
        });

  await setSessionCookie(user.id);

  return NextResponse.json({ success: true });
}
