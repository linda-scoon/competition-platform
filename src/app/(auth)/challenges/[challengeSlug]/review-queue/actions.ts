"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  claimReviewSubmissionInDb,
  releaseReviewClaimInDb,
} from "@/lib/runs/review-queue-repository";

export async function claimReviewSubmissionAction(
  args: { challengeSlug: string },
  formData: FormData,
) {
  const returnTo = `/challenges/${args.challengeSlug}/review-queue`;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const submissionId = String(formData.get("submissionId") ?? "").trim();

  if (!submissionId) {
    redirect(`${returnTo}?error=invalid_submission`);
  }

  const result = await claimReviewSubmissionInDb({
    challengeSlug: args.challengeSlug,
    submissionId,
    actorUserId: session.user.id,
  });

  if (result.outcome === "CLAIMED") {
    redirect(`${returnTo}?claimed=1`);
  }

  if (result.outcome === "ALREADY_CLAIMED_BY_YOU") {
    redirect(`${returnTo}?error=already_claimed_by_you`);
  }

  if (result.outcome === "ALREADY_CLAIMED_BY_OTHER") {
    redirect(`${returnTo}?error=already_claimed_by_other`);
  }

  if (result.outcome === "FORBIDDEN") {
    redirect(`${returnTo}?error=forbidden`);
  }

  redirect(`${returnTo}?error=submission_not_found`);
}

export async function releaseReviewClaimAction(
  args: { challengeSlug: string },
  formData: FormData,
) {
  const returnTo = `/challenges/${args.challengeSlug}/review-queue`;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const submissionId = String(formData.get("submissionId") ?? "").trim();

  if (!submissionId) {
    redirect(`${returnTo}?error=invalid_submission`);
  }

  const result = await releaseReviewClaimInDb({
    challengeSlug: args.challengeSlug,
    submissionId,
    actorUserId: session.user.id,
  });

  if (result.outcome === "RELEASED") {
    redirect(`${returnTo}?released=1`);
  }

  if (result.outcome === "NOT_CLAIMED") {
    redirect(`${returnTo}?error=not_claimed`);
  }

  if (result.outcome === "FORBIDDEN") {
    redirect(`${returnTo}?error=forbidden`);
  }

  redirect(`${returnTo}?error=submission_not_found`);
}
