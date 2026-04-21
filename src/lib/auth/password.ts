import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, storedHash] = stored.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const passwordHash = scryptSync(password, salt, KEY_LENGTH);
  const knownHash = Buffer.from(storedHash, "hex");

  if (knownHash.length !== passwordHash.length) {
    return false;
  }

  return timingSafeEqual(passwordHash, knownHash);
}
