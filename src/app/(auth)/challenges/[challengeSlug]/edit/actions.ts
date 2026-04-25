"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  ensureChallengeCreator,
  submitChallengePublishForModerationInDb,
  updateOwnedDraftBySlugInDb,
} from "@/lib/challenges/draft-repository";
import { challengeDraftInputSchema } from "@/lib/challenges/schema";

type EditChallengeDraftActionArgs = {
  challengeSlug: string;
};

export async function editChallengeDraftAction(args: EditChallengeDraftActionArgs, formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=/challenges/${args.challengeSlug}/edit`);
  }

  const user = session.user;

  const parsed = challengeDraftInputSchema.safeParse({
    title: formData.get("title"),
    shortDescription: formData.get("shortDescription"),
    longDescription: formData.get("longDescription"),
  });

  if (!parsed.success) {
    redirect(`/challenges/${args.challengeSlug}/edit?error=invalid_input`);
  }

  await ensureChallengeCreator(user);

  const updated = await updateOwnedDraftBySlugInDb({
    slug: args.challengeSlug,
    creatorUserId: user.id,
    values: parsed.data,
  });

  if (!updated) {
    redirect("/dashboard");
  }

  redirect(`/challenges/${args.challengeSlug}/edit?saved=1`);
}

export async function publishChallengeAction(args: EditChallengeDraftActionArgs, formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=/challenges/${args.challengeSlug}/edit`);
  }

  const user = session.user;

  const parsed = challengeDraftInputSchema.safeParse({
    title: formData.get("title"),
    shortDescription: formData.get("shortDescription"),
    longDescription: formData.get("longDescription"),
  });

  if (!parsed.success) {
    redirect(`/challenges/${args.challengeSlug}/edit?error=invalid_input`);
  }

  await ensureChallengeCreator(user);

  const result = await submitChallengePublishForModerationInDb({
    slug: args.challengeSlug,
    creatorUserId: user.id,
    values: parsed.data,
  });

  if (!result) {
    redirect("/dashboard");
  }

  const moderationNote = encodeURIComponent(result.moderationNotes.join(" "));
  redirect(`/challenges/${args.challengeSlug}/edit?publish=${result.outcome}&moderationNote=${moderationNote}`);
}
