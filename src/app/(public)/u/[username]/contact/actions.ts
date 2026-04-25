"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { sendContactRelayMessageInDb } from "@/lib/profiles/repository";

export async function sendContactRelayAction(recipientUsername: string, formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=/u/${recipientUsername}`);
  }

  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (body.length < 1) {
    redirect(`/u/${recipientUsername}?contact=body_required`);
  }

  const result = await sendContactRelayMessageInDb({
    senderUserId: session.user.id,
    recipientUsername,
    subject: subject.length > 0 ? subject : null,
    body,
  });

  if (result.outcome === "SENT") {
    redirect(`/u/${recipientUsername}?contact=sent`);
  }

  if (result.outcome === "NOT_CONTACTABLE") {
    redirect(`/u/${recipientUsername}?contact=not_contactable`);
  }

  if (result.outcome === "BLOCKED") {
    redirect(`/u/${recipientUsername}?contact=blocked`);
  }

  if (result.outcome === "SELF_CONTACT_NOT_ALLOWED") {
    redirect(`/u/${recipientUsername}?contact=self_not_allowed`);
  }

  redirect(`/u/${recipientUsername}?contact=not_found`);
}
