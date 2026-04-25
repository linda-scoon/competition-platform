import {
  ChallengeParticipantState,
  ChallengeVerifierAssignmentStatus,
  NotificationType,
  ParticipantVerificationVoteStatus,
  RunSubmissionStatus,
  VerificationDecisionMode,
  VerificationDecisionType,
} from "@prisma/client";

import { reconcileChallengeLifecycleByIdInDb } from "@/lib/challenges/state-transition-repository";
import { prisma } from "@/lib/db/prisma";

const DECIDABLE_SUBMISSION_STATUSES = [
  RunSubmissionStatus.UNDER_REVIEW,
  RunSubmissionStatus.SUBMITTED,
] as const;

export type RecordVerificationDecisionInput = {
  challengeSlug: string;
  submissionId: string;
  actorUserId: string;
  decisionType: VerificationDecisionType;
  note?: string;
};

export type RecordVerificationDecisionResult =
  | { outcome: "SUBMISSION_NOT_FOUND" }
  | { outcome: "FORBIDDEN" }
  | { outcome: "SELF_VERIFICATION_FORBIDDEN" }
  | { outcome: "NOTE_REQUIRED" }
  | { outcome: "DECISION_RECORDED" };

function decisionToSubmissionStatus(decisionType: VerificationDecisionType): RunSubmissionStatus {
  if (decisionType === VerificationDecisionType.APPROVE) {
    return RunSubmissionStatus.VERIFIED;
  }

  if (decisionType === VerificationDecisionType.REJECT) {
    return RunSubmissionStatus.REJECTED;
  }

  return RunSubmissionStatus.CORRECTION_REQUESTED;
}

function doesDecisionRequireNote(decisionType: VerificationDecisionType): boolean {
  return (
    decisionType === VerificationDecisionType.REJECT ||
    decisionType === VerificationDecisionType.CORRECTION_REQUESTED
  );
}

export async function recordVerificationDecisionInDb(
  input: RecordVerificationDecisionInput,
): Promise<RecordVerificationDecisionResult> {
  const trimmedNote = input.note?.trim();

  if (doesDecisionRequireNote(input.decisionType) && !trimmedNote) {
    return { outcome: "NOTE_REQUIRED" };
  }

  const challenge = await prisma.challenge.findUnique({
    where: {
      slug: input.challengeSlug,
    },
    select: {
      id: true,
    },
  });

  if (!challenge) {
    return { outcome: "SUBMISSION_NOT_FOUND" };
  }

  const [activeAssignment, activeFallbackVote, activeParticipant] = await Promise.all([
    prisma.challengeVerifierAssignment.findFirst({
      where: {
        challengeId: challenge.id,
        userId: input.actorUserId,
        status: ChallengeVerifierAssignmentStatus.ACTIVE,
        endedAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.participantVerificationVote.findFirst({
      where: {
        challengeId: challenge.id,
        status: ParticipantVerificationVoteStatus.PASSED,
      },
      select: {
        id: true,
      },
    }),
    prisma.challengeParticipant.findFirst({
      where: {
        challengeId: challenge.id,
        userId: input.actorUserId,
        state: ChallengeParticipantState.ACTIVE,
        leftAt: null,
      },
      select: {
        id: true,
      },
    }),
  ]);

  const canFallbackVerify = Boolean(activeFallbackVote) && Boolean(activeParticipant);
  const decisionMode = activeAssignment
    ? VerificationDecisionMode.NORMAL_VERIFIER
    : canFallbackVerify
      ? VerificationDecisionMode.FALLBACK_PARTICIPANT
      : null;

  if (!decisionMode) {
    return { outcome: "FORBIDDEN" };
  }

  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    const submission = await tx.runSubmission.findFirst({
      where: {
        id: input.submissionId,
        challengeId: challenge.id,
        resolvedAt: null,
        status: {
          in: [...DECIDABLE_SUBMISSION_STATUSES],
        },
      },
      select: {
        id: true,
        userId: true,
        challengeId: true,
        claimedByVerifierUserId: true,
      },
    });

    if (!submission) {
      return { outcome: "SUBMISSION_NOT_FOUND" } as const;
    }

    if (submission.claimedByVerifierUserId !== input.actorUserId) {
      return { outcome: "FORBIDDEN" } as const;
    }

    if (
      decisionMode === VerificationDecisionMode.FALLBACK_PARTICIPANT &&
      submission.userId === input.actorUserId
    ) {
      return { outcome: "SELF_VERIFICATION_FORBIDDEN" } as const;
    }

    await tx.verificationDecision.create({
      data: {
        submissionId: submission.id,
        deciderUserId: input.actorUserId,
        decisionType: input.decisionType,
        note: trimmedNote,
        mode: decisionMode,
      },
      select: {
        id: true,
      },
    });

    await tx.runSubmission.update({
      where: {
        id: submission.id,
      },
      data: {
        status: decisionToSubmissionStatus(input.decisionType),
        resolvedAt: now,
        claimedByVerifierUserId: null,
        claimedAt: null,
      },
      select: {
        id: true,
      },
    });

    await tx.notification.create({
      data: {
        userId: submission.userId,
        type: NotificationType.RUN_DECISION_RECORDED,
        payload: {
          challengeId: submission.challengeId,
          submissionId: submission.id,
          decisionType: input.decisionType,
          note: trimmedNote ?? null,
          decidedByUserId: input.actorUserId,
          decisionMode,
        },
      },
      select: {
        id: true,
      },
    });

    return { outcome: "DECISION_RECORDED" } as const;
  });

  if (result.outcome === "DECISION_RECORDED") {
    await reconcileChallengeLifecycleByIdInDb({ challengeId: challenge.id });
  }

  return result;
}
