"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { createChallengeDraftInDb, ensureChallengeCreator } from "@/lib/challenges/draft-repository";
import { challengeDraftInputSchema } from "@/lib/challenges/schema";

export async function createChallengeDraftAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/challenges/new");
  }

  const user = session.user;

  const parsed = challengeDraftInputSchema.safeParse({
    title: formData.get("title"),
    shortDescription: formData.get("shortDescription"),
    longDescription: formData.get("longDescription"),
  });

  if (!parsed.success) {
    redirect("/challenges/new?error=invalid_input");
  }

  await ensureChallengeCreator(user);

  const draft = await createChallengeDraftInDb({
    creatorUserId: user.id,
    ...parsed.data,
  });

  redirect(`/challenges/${draft.slug}/edit?created=1`);
}
