"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  blockUserByUsernameInDb,
  setContactabilityInDb,
  unblockUserByIdInDb,
} from "@/lib/profiles/repository";

export async function setContactabilityAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/profile");
  }

  const isContactable = String(formData.get("isContactable") ?? "true") === "true";

  await setContactabilityInDb({
    userId: session.user.id,
    isContactable,
  });

  redirect(`/dashboard/profile?updated=contactability_${isContactable ? "on" : "off"}`);
}

export async function blockUserAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/profile");
  }

  const blockedUsername = String(formData.get("blockedUsername") ?? "")
    .trim()
    .replace(/^@/, "");

  if (!blockedUsername) {
    redirect("/dashboard/profile?error=blocked_username_required");
  }

  const result = await blockUserByUsernameInDb({
    blockerUserId: session.user.id,
    blockedUsername,
  });

  if (result.outcome === "NOT_FOUND") {
    redirect("/dashboard/profile?error=blocked_user_not_found");
  }

  if (result.outcome === "SELF_BLOCK_NOT_ALLOWED") {
    redirect("/dashboard/profile?error=self_block_not_allowed");
  }

  redirect("/dashboard/profile?updated=blocked");
}

export async function unblockUserAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/profile");
  }

  const blockedUserId = String(formData.get("blockedUserId") ?? "").trim();

  if (!blockedUserId) {
    redirect("/dashboard/profile?error=blocked_user_missing");
  }

  await unblockUserByIdInDb({
    blockerUserId: session.user.id,
    blockedUserId,
  });

  redirect("/dashboard/profile?updated=unblocked");
}
