import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const SESSION_COOKIE = "sj_session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 180; // 180 days
const SESSION_COOKIE_SECURE =
  process.env.SESSION_COOKIE_SECURE === undefined
    ? process.env.NODE_ENV === "production"
    : process.env.SESSION_COOKIE_SECURE.toLowerCase() === "true";

const encoder = new TextEncoder();

type CookieStore = Awaited<ReturnType<typeof cookies>>;

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return encoder.encode(secret);
}

async function readOnlyCookies(): Promise<CookieStore> {
  return (await cookies()) as unknown as CookieStore;
}

async function mutableCookies(): Promise<
  CookieStore & {
    set: CookieStore["set"];
    delete: CookieStore["delete"];
  }
> {
  return (await cookies()) as unknown as CookieStore & {
    set: CookieStore["set"];
    delete: CookieStore["delete"];
  };
}

export async function setSessionCookie(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());

  const store = await mutableCookies();
  store.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: SESSION_COOKIE_SECURE,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  });
}

export async function getSessionUserId(): Promise<string | null> {
  const token = (await readOnlyCookies()).get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function clearSessionCookie() {
  const store = await mutableCookies();
  store.delete(SESSION_COOKIE);
}
