import {
  ChallengeParticipantState,
  ChallengeStatus,
  ChallengeVisibilityState,
  RunSubmissionLockState,
  RunSubmissionStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import { validateExternalVideoUrl } from "./video-url-validation";

type RunScorePayload = {
  primaryScore: number;
  notes?: string;
};

export type SubmitRunInput = {
  challengeSlug: string;
  userId: string;
  videoUrl: string;
  primaryScore: number;
  notes?: string;
};

export type SubmitRunResult =
  | { outcome: "SUBMITTED"; challengeSlug: string; submissionId: string }
  | { outcome: "CHALLENGE_NOT_FOUND_OR_INELIGIBLE" }
  | { outcome: "PARTICIPANT_NOT_ELIGIBLE" }
  | { outcome: "SUBMISSION_WINDOW_NOT_OPEN" }
  | { outcome: "SUBMISSION_WINDOW_CLOSED" }
  | { outcome: "INVALID_VIDEO_URL" }
  | { outcome: "UNSUPPORTED_VIDEO_HOST" }
  | { outcome: "UNSUPPORTED_VIDEO_FORMAT" };

const SUBMITTABLE_CHALLENGE_STATUSES = [
  ChallengeStatus.PUBLISHED_UNLOCKED,
  ChallengeStatus.PUBLISHED_SOFT_LOCKED,
  ChallengeStatus.ACTIVE_FULLY_LOCKED,
] as const;

export function normalizeRunScorePayload(input: { primaryScore: number; notes?: string }): RunScorePayload {
  const notes = input.notes?.trim();

  return notes
    ? {
        primaryScore: input.primaryScore,
        notes,
      }
    : {
        primaryScore: input.primaryScore,
      };
}

export async function submitLockedRunInDb(input: SubmitRunInput): Promise<SubmitRunResult> {
  const challenge = await prisma.challenge.findFirst({
    where: {
      slug: input.challengeSlug,
      isPublic: true,
      visibilityState: ChallengeVisibilityState.PUBLIC,
      lastApprovedVersionId: {
        not: null,
      },
      status: {
        in: [...SUBMITTABLE_CHALLENGE_STATUSES],
      },
    },
    select: {
      id: true,
      slug: true,
      submissionOpensAt: true,
      submissionClosesAt: true,
    },
  });

  if (!challenge) {
    return { outcome: "CHALLENGE_NOT_FOUND_OR_INELIGIBLE" };
  }

  const now = new Date();

  if (now < challenge.submissionOpensAt) {
    return { outcome: "SUBMISSION_WINDOW_NOT_OPEN" };
  }

  if (now > challenge.submissionClosesAt) {
    return { outcome: "SUBMISSION_WINDOW_CLOSED" };
  }

  const participant = await prisma.challengeParticipant.findFirst({
    where: {
      challengeId: challenge.id,
      userId: input.userId,
      state: ChallengeParticipantState.ACTIVE,
      leftAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!participant) {
    return { outcome: "PARTICIPANT_NOT_ELIGIBLE" };
  }

  const validatedVideo = validateExternalVideoUrl(input.videoUrl);

  if (!validatedVideo.ok) {
    if (validatedVideo.error === "UNSUPPORTED_HOST") {
      return { outcome: "UNSUPPORTED_VIDEO_HOST" };
    }

    if (validatedVideo.error === "UNSUPPORTED_FORMAT") {
      return { outcome: "UNSUPPORTED_VIDEO_FORMAT" };
    }

    return { outcome: "INVALID_VIDEO_URL" };
  }

  const scorePayload = normalizeRunScorePayload({
    primaryScore: input.primaryScore,
    notes: input.notes,
  });

  const submission = await prisma.runSubmission.create({
    data: {
      challengeId: challenge.id,
      userId: input.userId,
      status: RunSubmissionStatus.SUBMITTED,
      lockState: RunSubmissionLockState.LOCKED,
      videoUrl: validatedVideo.normalizedUrl,
      videoHost: validatedVideo.videoHost,
      scorePayload,
      submittedAt: now,
    },
    select: {
      id: true,
    },
  });

  return {
    outcome: "SUBMITTED",
    challengeSlug: challenge.slug,
    submissionId: submission.id,
  };
}
