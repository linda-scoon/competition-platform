import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import { parseEnv } from "@/lib/env";

const SESSION_COOKIE_NAME = "cp_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  expiresAt: number;
};

function getSecret() {
  return parseEnv(process.env).AUTH_SECRET;
}

function encode(payload: SessionPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

function decode(value: string): SessionPayload | null {
  try {
    const json = Buffer.from(value, "base64url").toString("utf-8");
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export async function createSession(user: { id: string; email: string; name: string }) {
  const payload: SessionPayload = {
    userId: user.id,
    email: user.email,
    name: user.name,
    expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
  };

  const encodedPayload = encode(payload);
  const signature = sign(encodedPayload);
  const sessionToken = `${encodedPayload}.${signature}`;

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = sign(encodedPayload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) {
    return null;
  }

  if (!timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }

  const payload = decode(encodedPayload);

  if (!payload || payload.expiresAt < Date.now()) {
    return null;
  }

  return {
    user: {
      id: payload.userId,
      email: payload.email,
      name: payload.name,
    },
  };
}

export { SESSION_COOKIE_NAME };
