"use server";

import { ParticipantVerificationVoteBallotValue } from "@prisma/client";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { castFallbackVoteBallotInDb } from "@/lib/challenges/fallback-vote-repository";

async function fallbackVoteAction(
  args: { challengeSlug: string; value: ParticipantVerificationVoteBallotValue },
) {
  const returnTo = `/challenges/${args.challengeSlug}/fallback-vote`;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const result = await castFallbackVoteBallotInDb({
    challengeSlug: args.challengeSlug,
    actorUserId: session.user.id,
    value: args.value,
  });

  if (result.outcome === "BALLOT_RECORDED") {
    redirect(`${returnTo}?voted=1`);
  }

  if (result.outcome === "FORBIDDEN") {
    redirect(`${returnTo}?error=forbidden`);
  }

  if (result.outcome === "VOTE_NOT_OPEN") {
    redirect(`${returnTo}?error=vote_not_open`);
  }

  redirect(`${returnTo}?error=not_found`);
}

export async function voteFallbackYesAction(args: { challengeSlug: string }) {
  return fallbackVoteAction({
    challengeSlug: args.challengeSlug,
    value: ParticipantVerificationVoteBallotValue.YES,
  });
}

export async function voteFallbackNoAction(args: { challengeSlug: string }) {
  return fallbackVoteAction({
    challengeSlug: args.challengeSlug,
    value: ParticipantVerificationVoteBallotValue.NO,
  });
}
