import {
  AuditActionType,
  AuditActorType,
  AuditObjectType,
  ChallengeStatus,
  Prisma,
  RunSubmissionStatus,
} from "@prisma/client";

import { ensureFallbackVoteOpenedForChallengeInTx } from "@/lib/challenges/fallback-vote-repository";
import { prisma } from "@/lib/db/prisma";

const FULL_LOCK_SOURCE_STATUSES = [
  ChallengeStatus.PUBLISHED_UNLOCKED,
  ChallengeStatus.PUBLISHED_SOFT_LOCKED,
] as const;

const CLOSED_SOURCE_STATUSES = [
  ChallengeStatus.PUBLISHED_UNLOCKED,
  ChallengeStatus.PUBLISHED_SOFT_LOCKED,
  ChallengeStatus.ACTIVE_FULLY_LOCKED,
] as const;

const REVIEWABLE_UNRESOLVED_STATUSES = [
  RunSubmissionStatus.SUBMITTED,
  RunSubmissionStatus.UNDER_REVIEW,
] as const;

type LifecycleTransition = {
  challengeId: string;
  previousStatus: ChallengeStatus;
  nextStatus: ChallengeStatus;
  reason:
    | "challenge_full_locked_on_submission_window_open"
    | "challenge_closed_on_submission_window_close"
    | "challenge_finalized_on_review_resolution";
};

type ReconcileResult = {
  transitionedToFullLock: boolean;
  transitionedToClosed: boolean;
  transitionedToFinalized: boolean;
};

async function writeLifecycleTransitionAuditLog(input: {
  challengeId: string;
  previousStatus: ChallengeStatus;
  nextStatus: ChallengeStatus;
  reason: LifecycleTransition["reason"];
  tx: Prisma.TransactionClient;
}) {
  await input.tx.auditLog.create({
    data: {
      actorUserId: null,
      actorType: AuditActorType.SYSTEM,
      objectType: AuditObjectType.CHALLENGE,
      objectId: input.challengeId,
      actionType: AuditActionType.UPDATE,
      reason: input.reason,
      metadata: {
        challengeId: input.challengeId,
        previousStatus: input.previousStatus,
        nextStatus: input.nextStatus,
      },
    },
  });
}

async function reconcileChallengeLifecycleByIdInTx(input: {
  challengeId: string;
  now: Date;
  tx: Prisma.TransactionClient;
}): Promise<ReconcileResult> {
  const challenge = await input.tx.challenge.findUnique({
    where: {
      id: input.challengeId,
    },
    select: {
      id: true,
      status: true,
      submissionOpensAt: true,
      submissionClosesAt: true,
      resultsFinalizedAt: true,
    },
  });

  if (!challenge) {
    return {
      transitionedToFullLock: false,
      transitionedToClosed: false,
      transitionedToFinalized: false,
    };
  }

  const transitions: LifecycleTransition[] = [];
  let currentStatus = challenge.status;
  let transitionedToFullLock = false;
  let transitionedToClosed = false;
  let transitionedToFinalized = false;

  const shouldTransitionToClosed =
    CLOSED_SOURCE_STATUSES.includes(currentStatus) && input.now > challenge.submissionClosesAt;

  if (shouldTransitionToClosed) {
    const closeUpdate = await input.tx.challenge.updateMany({
      where: {
        id: challenge.id,
        status: {
          in: [...CLOSED_SOURCE_STATUSES],
        },
      },
      data: {
        status: ChallengeStatus.CLOSED,
      },
    });

    if (closeUpdate.count > 0) {
      transitions.push({
        challengeId: challenge.id,
        previousStatus: currentStatus,
        nextStatus: ChallengeStatus.CLOSED,
        reason: "challenge_closed_on_submission_window_close",
      });

      currentStatus = ChallengeStatus.CLOSED;
      transitionedToClosed = true;
    }
  } else {
    const shouldTransitionToFullLock =
      FULL_LOCK_SOURCE_STATUSES.includes(currentStatus) &&
      input.now >= challenge.submissionOpensAt &&
      input.now <= challenge.submissionClosesAt;

    if (shouldTransitionToFullLock) {
      const fullLockUpdate = await input.tx.challenge.updateMany({
        where: {
          id: challenge.id,
          status: {
            in: [...FULL_LOCK_SOURCE_STATUSES],
          },
        },
        data: {
          status: ChallengeStatus.ACTIVE_FULLY_LOCKED,
        },
      });

      if (fullLockUpdate.count > 0) {
        transitions.push({
          challengeId: challenge.id,
          previousStatus: currentStatus,
          nextStatus: ChallengeStatus.ACTIVE_FULLY_LOCKED,
          reason: "challenge_full_locked_on_submission_window_open",
        });

        currentStatus = ChallengeStatus.ACTIVE_FULLY_LOCKED;
        transitionedToFullLock = true;
      }
    }
  }

  if (currentStatus === ChallengeStatus.CLOSED) {
    const unresolvedReviewableRunsCount = await input.tx.runSubmission.count({
      where: {
        challengeId: challenge.id,
        resolvedAt: null,
        status: {
          in: [...REVIEWABLE_UNRESOLVED_STATUSES],
        },
      },
    });

    if (unresolvedReviewableRunsCount > 0) {
      await ensureFallbackVoteOpenedForChallengeInTx({
        challengeId: challenge.id,
        tx: input.tx,
      });
    }

    if (unresolvedReviewableRunsCount < 1) {
      const finalizedUpdate = await input.tx.challenge.updateMany({
        where: {
          id: challenge.id,
          status: ChallengeStatus.CLOSED,
        },
        data: {
          status: ChallengeStatus.FINALIZED,
          resultsFinalizedAt: challenge.resultsFinalizedAt ?? input.now,
        },
      });

      if (finalizedUpdate.count > 0) {
        transitions.push({
          challengeId: challenge.id,
          previousStatus: currentStatus,
          nextStatus: ChallengeStatus.FINALIZED,
          reason: "challenge_finalized_on_review_resolution",
        });

        transitionedToFinalized = true;
      }
    }
  }

  for (const transition of transitions) {
    await writeLifecycleTransitionAuditLog({
      challengeId: transition.challengeId,
      previousStatus: transition.previousStatus,
      nextStatus: transition.nextStatus,
      reason: transition.reason,
      tx: input.tx,
    });
  }

  return {
    transitionedToFullLock,
    transitionedToClosed,
    transitionedToFinalized,
  };
}

export async function reconcileChallengeLifecycleByIdInDb(input: {
  challengeId: string;
  now?: Date;
}): Promise<ReconcileResult> {
  return prisma.$transaction((tx) =>
    reconcileChallengeLifecycleByIdInTx({
      challengeId: input.challengeId,
      now: input.now ?? new Date(),
      tx,
    }),
  );
}

export async function reconcileChallengeLifecycleBySlugInDb(input: {
  challengeSlug: string;
  now?: Date;
}) {
  const challenge = await prisma.challenge.findUnique({
    where: {
      slug: input.challengeSlug,
    },
    select: {
      id: true,
    },
  });

  if (!challenge) {
    return {
      transitionedToFullLock: false,
      transitionedToClosed: false,
      transitionedToFinalized: false,
    } satisfies ReconcileResult;
  }

  return reconcileChallengeLifecycleByIdInDb({
    challengeId: challenge.id,
    now: input.now,
  });
}

export async function reconcileDueChallengeLifecycleTransitionsInDb(input?: { now?: Date }) {
  const now = input?.now ?? new Date();

  const candidates = await prisma.challenge.findMany({
    where: {
      status: {
        in: [
          ChallengeStatus.PUBLISHED_UNLOCKED,
          ChallengeStatus.PUBLISHED_SOFT_LOCKED,
          ChallengeStatus.ACTIVE_FULLY_LOCKED,
          ChallengeStatus.CLOSED,
        ],
      },
    },
    select: {
      id: true,
    },
  });

  let transitionedToFullLockCount = 0;
  let transitionedToClosedCount = 0;
  let transitionedToFinalizedCount = 0;

  for (const candidate of candidates) {
    const result = await reconcileChallengeLifecycleByIdInDb({
      challengeId: candidate.id,
      now,
    });

    if (result.transitionedToFullLock) {
      transitionedToFullLockCount += 1;
    }

    if (result.transitionedToClosed) {
      transitionedToClosedCount += 1;
    }

    if (result.transitionedToFinalized) {
      transitionedToFinalizedCount += 1;
    }
  }

  return {
    transitionedToFullLockCount,
    transitionedToClosedCount,
    transitionedToFinalizedCount,
  };
}
