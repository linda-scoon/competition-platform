"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { joinPublicChallengeInDb } from "@/lib/challenges/join-repository";

type JoinChallengeActionArgs = {
  challengeSlug: string;
};

export async function joinChallengeAction(args: JoinChallengeActionArgs) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=/challenges/${args.challengeSlug}`);
  }

  const result = await joinPublicChallengeInDb({
    challengeSlug: args.challengeSlug,
    userId: session.user.id,
  });

  if (result.outcome === "JOINED") {
    const statusParam = result.softLockTriggered ? "joined_soft_locked" : "joined";
    redirect(`/challenges/${result.challengeSlug}?join=${statusParam}`);
  }

  if (result.outcome === "ALREADY_JOINED") {
    redirect(`/challenges/${result.challengeSlug}?join=already_joined`);
  }

  if (result.outcome === "OWNERSHIP_CONFLICT") {
    redirect(`/challenges/${args.challengeSlug}?join=owner_cannot_join`);
  }

  if (result.outcome === "JOIN_WINDOW_NOT_OPEN") {
    redirect(`/challenges/${args.challengeSlug}?join=window_not_open`);
  }

  if (result.outcome === "JOIN_WINDOW_CLOSED") {
    redirect(`/challenges/${args.challengeSlug}?join=window_closed`);
  }

  redirect(`/challenges/${args.challengeSlug}?join=ineligible`);
}
