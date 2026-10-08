import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { dbConnect } from "@/lib/db";
import { User, type Role, type UserDoc } from "@/lib/models";

export const SESSION_COOKIE = "bata_session";
const SESSION_DAYS = 7;

const secret = new TextEncoder().encode(
  process.env.SESSION_SECRET ?? "dev-only-secret-change-me"
);

export interface SessionPayload {
  userId: string;
  role: Role;
  name: string;
  /** Absent for employees who sign in with their employee code only. */
  email?: string;
  [key: string]: unknown;
}

export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret);
}

export async function decryptSession(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, secret, {
      algorithms: ["HS256"],
    });
    return payload;
  } catch {
    return null;
  }
}

/** Set the session cookie. Only callable from Server Actions / Route Handlers. */
export async function createSession(payload: SessionPayload) {
  const token = await encryptSession(payload);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/** Optimistic session read (JWT only, no DB hit). Cached per request. */
export const getSession = cache(async (): Promise<SessionPayload | null> => {
  const cookieStore = await cookies();
  return decryptSession(cookieStore.get(SESSION_COOKIE)?.value);
});

/**
 * Data Access Layer check: verifies the JWT *and* that the user still
 * exists and is active in the database. Redirects to /logout (which can
 * clear the cookie) when the account was removed or deactivated.
 */
export const getCurrentUser = cache(async (): Promise<UserDoc | null> => {
  const session = await getSession();
  if (!session) return null;
  await dbConnect();
  const user = await User.findById(session.userId).lean<UserDoc>();
  if (!user || !user.active) return null;
  return user;
});

export async function requireUser(roles?: Role[]): Promise<UserDoc> {
  const session = await getSession();
  if (!session) redirect("/login");
  const user = await getCurrentUser();
  if (!user) redirect("/logout"); // stale cookie for a deleted/deactivated account
  if (roles && !roles.includes(user.role)) redirect("/dashboard");
  return user;
}
