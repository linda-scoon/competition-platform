import {
  AuditActionType,
  AuditActorType,
  AuditObjectType,
  ChallengeParticipantState,
  ChallengeStatus,
  NotificationType,
  ParticipantVerificationVoteBallotValue,
  ParticipantVerificationVoteStatus,
  PlatformRoleType,
  ChallengeVerifierAssignmentStatus,
  Prisma,
  RunSubmissionStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const UNRESOLVED_REVIEWABLE_STATUSES = [
  RunSubmissionStatus.SUBMITTED,
  RunSubmissionStatus.UNDER_REVIEW,
] as const;

const ADMIN_ALERT_ROLES = [PlatformRoleType.SITE_ADMIN, PlatformRoleType.SUPER_ADMIN] as const;

type FallbackVoteEvaluation = {
  participantCount: number;
  ballotsCount: number;
  yesCount: number;
  hasPassed: boolean;
  hasFailed: boolean;
};

async function listActiveParticipantIds(input: {
  challengeId: string;
  tx: Prisma.TransactionClient;
}): Promise<string[]> {
  const participants = await input.tx.challengeParticipant.findMany({
    where: {
      challengeId: input.challengeId,
      state: ChallengeParticipantState.ACTIVE,
      leftAt: null,
    },
    select: {
      userId: true,
    },
  });

  return participants.map((participant) => participant.userId);
}

async function listSiteAdminIds(input: { tx: Prisma.TransactionClient }): Promise<string[]> {
  const roles = await input.tx.roleAssignment.findMany({
    where: {
      revokedAt: null,
      roleType: {
        in: [...ADMIN_ALERT_ROLES],
      },
    },
    select: {
      userId: true,
    },
    distinct: ["userId"],
  });

  return roles.map((role) => role.userId);
}

async function createVoteOpenNotifications(input: {
  challengeId: string;
  challengeSlug: string;
  voteId: string;
  tx: Prisma.TransactionClient;
}) {
  const [participantIds, adminIds] = await Promise.all([
    listActiveParticipantIds({ challengeId: input.challengeId, tx: input.tx }),
    listSiteAdminIds({ tx: input.tx }),
  ]);

  const recipientIds = [...new Set([...participantIds, ...adminIds])];

  if (recipientIds.length < 1) {
    return;
  }

  await input.tx.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      type: NotificationType.FALLBACK_VOTE_OPENED,
      payload: {
        challengeId: input.challengeId,
        challengeSlug: input.challengeSlug,
        voteId: input.voteId,
      },
    })),
  });
}

async function createVoteClosedNotifications(input: {
  challengeId: string;
  challengeSlug: string;
  voteId: string;
  voteStatus: ParticipantVerificationVoteStatus.PASSED | ParticipantVerificationVoteStatus.FAILED;
  evaluation: FallbackVoteEvaluation;
  tx: Prisma.TransactionClient;
}) {
  const [participantIds, adminIds] = await Promise.all([
    listActiveParticipantIds({ challengeId: input.challengeId, tx: input.tx }),
    listSiteAdminIds({ tx: input.tx }),
  ]);

  const recipientIds = [...new Set([...participantIds, ...adminIds])];

  if (recipientIds.length < 1) {
    return;
  }

  await input.tx.notification.createMany({
    data: recipientIds.map((userId) => ({
      userId,
      type: NotificationType.FALLBACK_VOTE_CLOSED,
      payload: {
        challengeId: input.challengeId,
        challengeSlug: input.challengeSlug,
        voteId: input.voteId,
        voteStatus: input.voteStatus,
        participantCount: input.evaluation.participantCount,
        ballotsCount: input.evaluation.ballotsCount,
        yesCount: input.evaluation.yesCount,
      },
    })),
  });
}

async function evaluateVoteInTx(input: {
  voteId: string;
  challengeId: string;
  tx: Prisma.TransactionClient;
}): Promise<FallbackVoteEvaluation> {
  const [participantCount, ballotsCount, yesCount] = await Promise.all([
    input.tx.challengeParticipant.count({
      where: {
        challengeId: input.challengeId,
        state: ChallengeParticipantState.ACTIVE,
        leftAt: null,
      },
    }),
    input.tx.participantVerificationVoteBallot.count({
      where: {
        voteId: input.voteId,
      },
    }),
    input.tx.participantVerificationVoteBallot.count({
      where: {
        voteId: input.voteId,
        value: ParticipantVerificationVoteBallotValue.YES,
      },
    }),
  ]);

  const hasMinimumParticipants = participantCount >= 3;
  const hasPassed = hasMinimumParticipants && yesCount > participantCount / 2;
  const hasFailed = ballotsCount >= participantCount && !hasPassed;

  return {
    participantCount,
    ballotsCount,
    yesCount,
    hasPassed,
    hasFailed,
  };
}

export async function ensureFallbackVoteOpenedForChallengeInTx(input: {
  challengeId: string;
  tx: Prisma.TransactionClient;
}): Promise<{ opened: boolean; voteId: string | null }> {
  const challenge = await input.tx.challenge.findUnique({
    where: {
      id: input.challengeId,
    },
    select: {
      id: true,
      slug: true,
      status: true,
    },
  });

  if (!challenge || challenge.status !== ChallengeStatus.CLOSED) {
    return {
      opened: false,
      voteId: null,
    };
  }

  const [unresolvedRunsCount, activeVerifierCount, existingOpenVote] = await Promise.all([
    input.tx.runSubmission.count({
      where: {
        challengeId: challenge.id,
        resolvedAt: null,
        status: {
          in: [...UNRESOLVED_REVIEWABLE_STATUSES],
        },
      },
    }),
    input.tx.challengeVerifierAssignment.count({
      where: {
        challengeId: challenge.id,
        status: ChallengeVerifierAssignmentStatus.ACTIVE,
        endedAt: null,
      },
    }),
    input.tx.participantVerificationVote.findFirst({
      where: {
        challengeId: challenge.id,
        status: ParticipantVerificationVoteStatus.OPEN,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (existingOpenVote) {
    return {
      opened: false,
      voteId: existingOpenVote.id,
    };
  }

  if (unresolvedRunsCount < 1 || activeVerifierCount > 0) {
    return {
      opened: false,
      voteId: null,
    };
  }

  const vote = await input.tx.participantVerificationVote.create({
    data: {
      challengeId: challenge.id,
      status: ParticipantVerificationVoteStatus.OPEN,
      openedReason: "closed_with_unresolved_runs_and_no_active_verifiers",
    },
    select: {
      id: true,
    },
  });

  await input.tx.auditLog.create({
    data: {
      actorUserId: null,
      actorType: AuditActorType.SYSTEM,
      objectType: AuditObjectType.PARTICIPANT_VERIFICATION_VOTE,
      objectId: vote.id,
      actionType: AuditActionType.OPEN,
      reason: "fallback_vote_opened_no_active_verifiers",
      metadata: {
        challengeId: challenge.id,
      },
    },
  });

  await createVoteOpenNotifications({
    challengeId: challenge.id,
    challengeSlug: challenge.slug,
    voteId: vote.id,
    tx: input.tx,
  });

  return {
    opened: true,
    voteId: vote.id,
  };
}

export type CastFallbackVoteBallotResult =
  | { outcome: "CHALLENGE_NOT_FOUND" }
  | { outcome: "FORBIDDEN" }
  | { outcome: "VOTE_NOT_OPEN" }
  | {
      outcome: "BALLOT_RECORDED";
      voteStatus: ParticipantVerificationVoteStatus.OPEN | ParticipantVerificationVoteStatus.PASSED | ParticipantVerificationVoteStatus.FAILED;
      participantCount: number;
      ballotsCount: number;
      yesCount: number;
    };

export async function castFallbackVoteBallotInDb(input: {
  challengeSlug: string;
  actorUserId: string;
  value: ParticipantVerificationVoteBallotValue;
}): Promise<CastFallbackVoteBallotResult> {
  const challenge = await prisma.challenge.findUnique({
    where: {
      slug: input.challengeSlug,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!challenge) {
    return { outcome: "CHALLENGE_NOT_FOUND" };
  }

  const participant = await prisma.challengeParticipant.findFirst({
    where: {
      challengeId: challenge.id,
      userId: input.actorUserId,
      state: ChallengeParticipantState.ACTIVE,
      leftAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!participant) {
    return { outcome: "FORBIDDEN" };
  }

  return prisma.$transaction(async (tx) => {
    const vote = await tx.participantVerificationVote.findFirst({
      where: {
        challengeId: challenge.id,
        status: ParticipantVerificationVoteStatus.OPEN,
      },
      select: {
        id: true,
      },
    });

    if (!vote) {
      return { outcome: "VOTE_NOT_OPEN" } as const;
    }

    await tx.participantVerificationVoteBallot.upsert({
      where: {
        voteId_userId: {
          voteId: vote.id,
          userId: input.actorUserId,
        },
      },
      update: {
        value: input.value,
      },
      create: {
        voteId: vote.id,
        userId: input.actorUserId,
        value: input.value,
      },
      select: {
        id: true,
      },
    });

    const evaluation = await evaluateVoteInTx({
      voteId: vote.id,
      challengeId: challenge.id,
      tx,
    });

    let voteStatus: ParticipantVerificationVoteStatus.OPEN | ParticipantVerificationVoteStatus.PASSED | ParticipantVerificationVoteStatus.FAILED =
      ParticipantVerificationVoteStatus.OPEN;

    if (evaluation.hasPassed) {
      voteStatus = ParticipantVerificationVoteStatus.PASSED;
    } else if (evaluation.hasFailed) {
      voteStatus = ParticipantVerificationVoteStatus.FAILED;
    }

    if (voteStatus !== ParticipantVerificationVoteStatus.OPEN) {
      await tx.participantVerificationVote.updateMany({
        where: {
          id: vote.id,
          status: ParticipantVerificationVoteStatus.OPEN,
        },
        data: {
          status: voteStatus,
          closedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          actorUserId: input.actorUserId,
          actorType: AuditActorType.USER,
          objectType: AuditObjectType.PARTICIPANT_VERIFICATION_VOTE,
          objectId: vote.id,
          actionType: AuditActionType.CLOSE,
          reason:
            voteStatus === ParticipantVerificationVoteStatus.PASSED
              ? "fallback_vote_passed"
              : "fallback_vote_failed",
          metadata: {
            challengeId: challenge.id,
            participantCount: evaluation.participantCount,
            ballotsCount: evaluation.ballotsCount,
            yesCount: evaluation.yesCount,
          },
        },
      });

      await createVoteClosedNotifications({
        challengeId: challenge.id,
        challengeSlug: challenge.slug,
        voteId: vote.id,
        voteStatus,
        evaluation,
        tx,
      });
    }

    return {
      outcome: "BALLOT_RECORDED",
      voteStatus,
      participantCount: evaluation.participantCount,
      ballotsCount: evaluation.ballotsCount,
      yesCount: evaluation.yesCount,
    } as const;
  });
}

export async function userCanFallbackVerifyInDb(input: {
  challengeId: string;
  actorUserId: string;
}): Promise<boolean> {
  const [isActiveParticipant, hasPassedVote] = await Promise.all([
    prisma.challengeParticipant.findFirst({
      where: {
        challengeId: input.challengeId,
        userId: input.actorUserId,
        state: ChallengeParticipantState.ACTIVE,
        leftAt: null,
      },
      select: {
        id: true,
      },
    }),
    prisma.participantVerificationVote.findFirst({
      where: {
        challengeId: input.challengeId,
        status: ParticipantVerificationVoteStatus.PASSED,
      },
      select: {
        id: true,
      },
    }),
  ]);

  return Boolean(isActiveParticipant) && Boolean(hasPassedVote);
}

export async function getFallbackVoteViewStateFromDb(input: {
  challengeSlug: string;
  actorUserId: string;
}): Promise<
  | { outcome: "NOT_FOUND" }
  | { outcome: "FORBIDDEN" }
  | {
      outcome: "VISIBLE";
      challenge: {
        id: string;
        slug: string;
        title: string;
      };
      vote:
        | {
            id: string;
            status: ParticipantVerificationVoteStatus;
            openedAt: Date;
            closedAt: Date | null;
            participantCount: number;
            ballotsCount: number;
            yesCount: number;
            noCount: number;
            actorBallot: ParticipantVerificationVoteBallotValue | null;
          }
        | null;
    }
> {
  const challenge = await prisma.challenge.findUnique({
    where: {
      slug: input.challengeSlug,
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  if (!challenge) {
    return { outcome: "NOT_FOUND" };
  }

  const participant = await prisma.challengeParticipant.findFirst({
    where: {
      challengeId: challenge.id,
      userId: input.actorUserId,
      state: ChallengeParticipantState.ACTIVE,
      leftAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!participant) {
    return { outcome: "FORBIDDEN" };
  }

  const [vote, participantCount] = await Promise.all([
    prisma.participantVerificationVote.findFirst({
      where: {
        challengeId: challenge.id,
      },
      orderBy: {
        openedAt: "desc",
      },
      select: {
        id: true,
        status: true,
        openedAt: true,
        closedAt: true,
      },
    }),
    prisma.challengeParticipant.count({
      where: {
        challengeId: challenge.id,
        state: ChallengeParticipantState.ACTIVE,
        leftAt: null,
      },
    }),
  ]);

  if (!vote) {
    return {
      outcome: "VISIBLE",
      challenge,
      vote: null,
    };
  }

  const [ballotsCount, yesCount, noCount, actorBallot] = await Promise.all([
    prisma.participantVerificationVoteBallot.count({
      where: {
        voteId: vote.id,
      },
    }),
    prisma.participantVerificationVoteBallot.count({
      where: {
        voteId: vote.id,
        value: ParticipantVerificationVoteBallotValue.YES,
      },
    }),
    prisma.participantVerificationVoteBallot.count({
      where: {
        voteId: vote.id,
        value: ParticipantVerificationVoteBallotValue.NO,
      },
    }),
    prisma.participantVerificationVoteBallot.findUnique({
      where: {
        voteId_userId: {
          voteId: vote.id,
          userId: input.actorUserId,
        },
      },
      select: {
        value: true,
      },
    }),
  ]);

  return {
    outcome: "VISIBLE",
    challenge,
    vote: {
      ...vote,
      participantCount,
      ballotsCount,
      yesCount,
      noCount,
      actorBallot: actorBallot?.value ?? null,
    },
  };
}
