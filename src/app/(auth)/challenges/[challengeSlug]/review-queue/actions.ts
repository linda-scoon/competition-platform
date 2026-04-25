"use server";

import { VerificationDecisionType } from "@prisma/client";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  claimReviewSubmissionInDb,
  releaseReviewClaimInDb,
} from "@/lib/runs/review-queue-repository";
import { recordVerificationDecisionInDb } from "@/lib/runs/verification-decision-repository";

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

async function verificationDecisionAction(
  args: { challengeSlug: string; decisionType: VerificationDecisionType },
  formData: FormData,
) {
  const returnTo = `/challenges/${args.challengeSlug}/review-queue`;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const submissionId = String(formData.get("submissionId") ?? "").trim();
  const note = String(formData.get("note") ?? "");

  if (!submissionId) {
    redirect(`${returnTo}?error=invalid_submission`);
  }

  const result = await recordVerificationDecisionInDb({
    challengeSlug: args.challengeSlug,
    submissionId,
    actorUserId: session.user.id,
    decisionType: args.decisionType,
    note,
  });

  if (result.outcome === "DECISION_RECORDED") {
    const outcome =
      args.decisionType === VerificationDecisionType.APPROVE
        ? "approved"
        : args.decisionType === VerificationDecisionType.REJECT
          ? "rejected"
          : "correction_requested";

    redirect(`${returnTo}?${outcome}=1`);
  }

  if (result.outcome === "NOTE_REQUIRED") {
    redirect(`${returnTo}?error=decision_note_required`);
  }

  if (result.outcome === "FORBIDDEN") {
    redirect(`${returnTo}?error=forbidden`);
  }

  redirect(`${returnTo}?error=submission_not_found`);
}

export async function approveSubmissionAction(args: { challengeSlug: string }, formData: FormData) {
  return verificationDecisionAction(
    {
      challengeSlug: args.challengeSlug,
      decisionType: VerificationDecisionType.APPROVE,
    },
    formData,
  );
}

export async function rejectSubmissionAction(args: { challengeSlug: string }, formData: FormData) {
  return verificationDecisionAction(
    {
      challengeSlug: args.challengeSlug,
      decisionType: VerificationDecisionType.REJECT,
    },
    formData,
  );
}

export async function requestCorrectionSubmissionAction(
  args: { challengeSlug: string },
  formData: FormData,
) {
  return verificationDecisionAction(
    {
      challengeSlug: args.challengeSlug,
      decisionType: VerificationDecisionType.CORRECTION_REQUESTED,
    },
    formData,
  );
}
