import {
  ChallengeStatus,
  ChallengeVersionStatus,
  ChallengeVisibilityState,
  ContactRelayDeliveryStatus,
  MediaAssetStatus,
  ParticipantVerificationVoteStatus,
  RunSubmissionStatus,
  VerifierRequestStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const RUN_QUEUE_STATUSES: RunSubmissionStatus[] = [
  RunSubmissionStatus.SUBMITTED,
  RunSubmissionStatus.UNDER_REVIEW,
  RunSubmissionStatus.CORRECTION_REQUESTED,
];

const MODERATION_PENDING_VISIBILITY_STATES: ChallengeVisibilityState[] = [
  ChallengeVisibilityState.HIDDEN_BY_ADMIN,
  ChallengeVisibilityState.HIDDEN_BY_MODERATION,
];

export async function getAdminOperationsOverviewFromDb() {
  const [
    auditLogCount,
    runQueueCount,
    unresolvedClosedChallengeCount,
    pendingChallengeVersionCount,
    activeSuspendedUserCount,
    pendingMediaModerationCount,
    failedContactRelayCount,
  ] = await Promise.all([
    prisma.auditLog.count(),
    prisma.runSubmission.count({
      where: {
        status: {
          in: RUN_QUEUE_STATUSES,
        },
      },
    }),
    prisma.challenge.count({
      where: {
        status: ChallengeStatus.CLOSED,
        resultsFinalizedAt: null,
      },
    }),
    prisma.challengeVersion.count({
      where: {
        status: ChallengeVersionStatus.PENDING_MODERATION,
      },
    }),
    prisma.user.count({
      where: {
        isSuspended: true,
      },
    }),
    prisma.mediaAsset.count({
      where: {
        status: MediaAssetStatus.PENDING_MODERATION,
      },
    }),
    prisma.contactRelayMessage.count({
      where: {
        deliveryStatus: ContactRelayDeliveryStatus.FAILED,
      },
    }),
  ]);

  return {
    auditLogCount,
    runQueueCount,
    unresolvedClosedChallengeCount,
    pendingChallengeVersionCount,
    activeSuspendedUserCount,
    pendingMediaModerationCount,
    failedContactRelayCount,
  };
}

export async function listAdminOperationalRunsFromDb() {
  return prisma.runSubmission.findMany({
    where: {
      status: {
        in: RUN_QUEUE_STATUSES,
      },
    },
    select: {
      id: true,
      status: true,
      submittedAt: true,
      claimedAt: true,
      challenge: {
        select: {
          id: true,
          slug: true,
          title: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      claimedByVerifierUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ claimedAt: "asc" }, { submittedAt: "asc" }],
    take: 100,
  });
}

export async function listAdminChallengeOperationsFromDb() {
  return prisma.challenge.findMany({
    where: {
      OR: [
        {
          status: ChallengeStatus.CLOSED,
          resultsFinalizedAt: null,
        },
        {
          status: ChallengeStatus.CANCELED,
        },
        {
          visibilityState: {
            in: MODERATION_PENDING_VISIBILITY_STATES,
          },
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      visibilityState: true,
      submissionClosesAt: true,
      resultsFinalizedAt: true,
      creator: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      _count: {
        select: {
          runSubmissions: {
            where: {
              status: {
                in: RUN_QUEUE_STATUSES,
              },
            },
          },
          participantVotes: {
            where: {
              status: ParticipantVerificationVoteStatus.OPEN,
            },
          },
        },
      },
    },
    orderBy: [{ status: "asc" }, { submissionClosesAt: "desc" }],
    take: 100,
  });
}

export async function listAdminUserOperationsFromDb() {
  return prisma.user.findMany({
    where: {
      OR: [
        {
          isSuspended: true,
        },
        {
          verifierRequests: {
            some: {
              status: VerifierRequestStatus.PENDING,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
      isSuspended: true,
      createdAt: true,
      _count: {
        select: {
          verifierRequests: {
            where: {
              status: VerifierRequestStatus.PENDING,
            },
          },
          roleAssignments: {
            where: {
              revokedAt: null,
            },
          },
          blocksGiven: true,
          blocksReceived: true,
        },
      },
    },
    orderBy: [{ isSuspended: "desc" }, { createdAt: "asc" }],
    take: 100,
  });
}

export async function listAdminAIModerationItemsFromDb() {
  const [pendingChallengeVersions, pendingMediaAssets] = await Promise.all([
    prisma.challengeVersion.findMany({
      where: {
        status: ChallengeVersionStatus.PENDING_MODERATION,
      },
      select: {
        id: true,
        versionNumber: true,
        createdAt: true,
        challenge: {
          select: {
            id: true,
            slug: true,
            title: true,
          },
        },
        createdByUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100,
    }),
    prisma.mediaAsset.findMany({
      where: {
        status: MediaAssetStatus.PENDING_MODERATION,
      },
      select: {
        id: true,
        type: true,
        createdAt: true,
        ownerUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
      take: 100,
    }),
  ]);

  return {
    pendingChallengeVersions,
    pendingMediaAssets,
  };
}

export async function listRecentAdminAuditLogsFromDb() {
  return prisma.auditLog.findMany({
    select: {
      id: true,
      actorType: true,
      actionType: true,
      objectType: true,
      objectId: true,
      reason: true,
      createdAt: true,
      actorUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 200,
  });
}

export async function listProblemContactRelayMessagesFromDb() {
  return prisma.contactRelayMessage.findMany({
    where: {
      deliveryStatus: {
        in: [ContactRelayDeliveryStatus.QUEUED, ContactRelayDeliveryStatus.FAILED],
      },
    },
    select: {
      id: true,
      deliveryStatus: true,
      createdAt: true,
      sentAt: true,
      senderUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      recipientUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
    orderBy: [{ deliveryStatus: "desc" }, { createdAt: "asc" }],
    take: 200,
  });
}
