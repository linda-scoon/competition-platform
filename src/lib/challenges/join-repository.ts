import {
  AuditActionType,
  AuditActorType,
  AuditObjectType,
  ChallengeParticipantState,
  ChallengeStatus,
  ChallengeVisibilityState,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type JoinPublicChallengeInput = {
  challengeSlug: string;
  userId: string;
};

export type JoinPublicChallengeResult =
  | { outcome: "JOINED"; challengeSlug: string; softLockTriggered: boolean }
  | { outcome: "ALREADY_JOINED"; challengeSlug: string }
  | { outcome: "NOT_FOUND_OR_INELIGIBLE" }
  | { outcome: "OWNERSHIP_CONFLICT" }
  | { outcome: "JOIN_WINDOW_NOT_OPEN" }
  | { outcome: "JOIN_WINDOW_CLOSED" };

export async function joinPublicChallengeInDb({
  challengeSlug,
  userId,
}: JoinPublicChallengeInput): Promise<JoinPublicChallengeResult> {
  const challenge = await prisma.challenge.findFirst({
    where: {
      slug: challengeSlug,
      isPublic: true,
      visibilityState: ChallengeVisibilityState.PUBLIC,
      lastApprovedVersionId: {
        not: null,
      },
      status: {
        in: [ChallengeStatus.PUBLISHED_UNLOCKED, ChallengeStatus.PUBLISHED_SOFT_LOCKED],
      },
    },
    select: {
      id: true,
      slug: true,
      creatorUserId: true,
      status: true,
      joinOpensAt: true,
      joinClosesAt: true,
    },
  });

  if (!challenge) {
    return { outcome: "NOT_FOUND_OR_INELIGIBLE" };
  }

  if (challenge.creatorUserId === userId) {
    return { outcome: "OWNERSHIP_CONFLICT" };
  }

  const now = new Date();

  if (challenge.joinOpensAt && now < challenge.joinOpensAt) {
    return { outcome: "JOIN_WINDOW_NOT_OPEN" };
  }

  if (challenge.joinClosesAt && now > challenge.joinClosesAt) {
    return { outcome: "JOIN_WINDOW_CLOSED" };
  }

  const existingActiveParticipant = await prisma.challengeParticipant.findFirst({
    where: {
      challengeId: challenge.id,
      userId,
      state: ChallengeParticipantState.ACTIVE,
    },
    select: { id: true },
  });

  if (existingActiveParticipant) {
    return {
      outcome: "ALREADY_JOINED",
      challengeSlug: challenge.slug,
    };
  }

  return prisma.$transaction(async (tx) => {
    const participant = await tx.challengeParticipant.create({
      data: {
        challengeId: challenge.id,
        userId,
        state: ChallengeParticipantState.ACTIVE,
      },
      select: {
        id: true,
      },
    });

    const softLockUpdate = await tx.challenge.updateMany({
      where: {
        id: challenge.id,
        status: ChallengeStatus.PUBLISHED_UNLOCKED,
      },
      data: {
        status: ChallengeStatus.PUBLISHED_SOFT_LOCKED,
      },
    });

    const softLockTriggered = softLockUpdate.count > 0;

    await tx.auditLog.create({
      data: {
        actorUserId: userId,
        actorType: AuditActorType.USER,
        objectType: AuditObjectType.CHALLENGE,
        objectId: challenge.id,
        actionType: AuditActionType.CREATE,
        reason: "participant_joined",
        metadata: {
          challengeId: challenge.id,
          participantUserId: userId,
          participantId: participant.id,
          softLockTriggered,
        },
      },
    });

    if (softLockTriggered) {
      await tx.auditLog.create({
        data: {
          actorUserId: userId,
          actorType: AuditActorType.USER,
          objectType: AuditObjectType.CHALLENGE,
          objectId: challenge.id,
          actionType: AuditActionType.UPDATE,
          reason: "challenge_soft_locked_on_first_join",
          metadata: {
            challengeId: challenge.id,
            previousStatus: ChallengeStatus.PUBLISHED_UNLOCKED,
            nextStatus: ChallengeStatus.PUBLISHED_SOFT_LOCKED,
            triggeredByUserId: userId,
          },
        },
      });
    }

    return {
      outcome: "JOINED",
      challengeSlug: challenge.slug,
      softLockTriggered,
    } satisfies JoinPublicChallengeResult;
  });
}
