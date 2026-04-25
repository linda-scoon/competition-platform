"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  assignChallengeVerifierInDb,
  removeChallengeVerifierAssignmentInDb,
} from "@/lib/challenges/verifier-assignment-repository";

export async function assignVerifierAction(args: { challengeSlug: string }, formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect(
      `/sign-in?returnTo=${encodeURIComponent(`/challenges/${args.challengeSlug}/verifiers`)}`,
    );
  }

  const verifierUserId = String(formData.get("verifierUserId") ?? "").trim();

  if (!verifierUserId) {
    redirect(`/challenges/${args.challengeSlug}/verifiers?error=invalid_verifier`);
  }

  const result = await assignChallengeVerifierInDb({
    challengeSlug: args.challengeSlug,
    creatorUserId: session.user.id,
    verifierUserId,
  });

  if (result.outcome === "ASSIGNED") {
    redirect(`/challenges/${args.challengeSlug}/verifiers?assigned=1`);
  }

  if (result.outcome === "CHALLENGE_NOT_FOUND") {
    redirect("/dashboard");
  }

  if (result.outcome === "CANDIDATE_NOT_ELIGIBLE") {
    redirect(`/challenges/${args.challengeSlug}/verifiers?error=not_in_pool`);
  }

  if (result.outcome === "SELF_ASSIGNMENT_BLOCKED") {
    redirect(`/challenges/${args.challengeSlug}/verifiers?error=self_assignment_blocked`);
  }

  if (result.outcome === "CONFLICT_BLOCKED") {
    redirect(`/challenges/${args.challengeSlug}/verifiers?error=conflict_blocked`);
  }

  redirect(`/challenges/${args.challengeSlug}/verifiers?error=already_assigned`);
}

export async function removeVerifierAction(args: { challengeSlug: string }, formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect(
      `/sign-in?returnTo=${encodeURIComponent(`/challenges/${args.challengeSlug}/verifiers`)}`,
    );
  }

  const assignmentId = String(formData.get("assignmentId") ?? "").trim();

  if (!assignmentId) {
    redirect(`/challenges/${args.challengeSlug}/verifiers?error=invalid_assignment`);
  }

  const result = await removeChallengeVerifierAssignmentInDb({
    challengeSlug: args.challengeSlug,
    creatorUserId: session.user.id,
    assignmentId,
  });

  if (result.outcome === "REMOVED") {
    redirect(`/challenges/${args.challengeSlug}/verifiers?removed=1`);
  }

  if (result.outcome === "CHALLENGE_NOT_FOUND") {
    redirect("/dashboard");
  }

  if (result.outcome === "ASSIGNMENT_NOT_FOUND") {
    redirect(`/challenges/${args.challengeSlug}/verifiers?error=assignment_not_found`);
  }

  redirect(`/challenges/${args.challengeSlug}/verifiers?error=assignment_not_active`);
}
