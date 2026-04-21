"use server";

import { redirect } from "next/navigation";

import { createSession } from "@/lib/auth/session";
import { normalizeReturnTo } from "@/lib/auth/return-to-origin";
import { findUserByEmail } from "@/lib/auth/store";
import { verifyPassword } from "@/lib/auth/password";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const returnTo = normalizeReturnTo(String(formData.get("returnTo") ?? ""));

  const user = findUserByEmail(email);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect(`/sign-in?error=invalid_credentials&returnTo=${encodeURIComponent(returnTo)}`);
  }

  await createSession(user);
  redirect(returnTo);
}
