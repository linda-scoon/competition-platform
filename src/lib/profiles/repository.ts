import {
  ChallengeParticipantState,
  ChallengeStatus,
  ChallengeVisibilityState,
  ContactRelayDeliveryStatus,
  MediaAssetStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type PublicProfileChallenge = {
  id: string;
  slug: string;
  title: string;
  status: ChallengeStatus;
};

export type PublicProfile = {
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarImageUrl: string | null;
  isContactable: boolean;
  createdChallenges: PublicProfileChallenge[];
  joinedChallenges: PublicProfileChallenge[];
  isBlockedBetweenUsers: boolean;
};

type GetPublicProfileInput = {
  username: string;
  viewerUserId?: string;
};

const PUBLIC_CHALLENGE_WHERE = {
  isPublic: true,
  visibilityState: ChallengeVisibilityState.PUBLIC,
  lastApprovedVersionId: {
    not: null,
  },
  status: {
    in: [
      ChallengeStatus.PUBLISHED_UNLOCKED,
      ChallengeStatus.PUBLISHED_SOFT_LOCKED,
      ChallengeStatus.ACTIVE_FULLY_LOCKED,
      ChallengeStatus.CLOSED,
      ChallengeStatus.FINALIZED,
    ],
  },
} as const;

export async function getPublicProfileByUsernameFromDb(
  input: GetPublicProfileInput,
): Promise<PublicProfile | null> {
  const user = await prisma.user.findUnique({
    where: {
      username: input.username,
    },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      isContactable: true,
      avatarImage: {
        select: {
          storageKey: true,
          status: true,
        },
      },
      challengesCreated: {
        where: PUBLIC_CHALLENGE_WHERE,
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          slug: true,
          status: true,
          lastApprovedVersion: {
            select: {
              title: true,
            },
          },
        },
      },
      challengeParticipants: {
        where: {
          state: ChallengeParticipantState.ACTIVE,
          challenge: PUBLIC_CHALLENGE_WHERE,
        },
        orderBy: {
          joinedAt: "desc",
        },
        select: {
          challenge: {
            select: {
              id: true,
              slug: true,
              status: true,
              lastApprovedVersion: {
                select: {
                  title: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const isBlockedBetweenUsers =
    input.viewerUserId && input.viewerUserId !== user.id
      ? Boolean(
          await prisma.userBlock.findFirst({
            where: {
              OR: [
                {
                  blockerUserId: input.viewerUserId,
                  blockedUserId: user.id,
                },
                {
                  blockerUserId: user.id,
                  blockedUserId: input.viewerUserId,
                },
              ],
            },
            select: {
              id: true,
            },
          }),
        )
      : false;

  return {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio,
    isContactable: user.isContactable,
    avatarImageUrl:
      user.avatarImage?.status === MediaAssetStatus.APPROVED ? user.avatarImage.storageKey : null,
    isBlockedBetweenUsers,
    createdChallenges: user.challengesCreated
      .map((challenge) => {
        if (!challenge.lastApprovedVersion) {
          return null;
        }

        return {
          id: challenge.id,
          slug: challenge.slug,
          status: challenge.status,
          title: challenge.lastApprovedVersion.title,
        } satisfies PublicProfileChallenge;
      })
      .filter((challenge): challenge is PublicProfileChallenge => challenge !== null),
    joinedChallenges: user.challengeParticipants
      .map((participant) => {
        if (!participant.challenge.lastApprovedVersion) {
          return null;
        }

        return {
          id: participant.challenge.id,
          slug: participant.challenge.slug,
          status: participant.challenge.status,
          title: participant.challenge.lastApprovedVersion.title,
        } satisfies PublicProfileChallenge;
      })
      .filter((challenge): challenge is PublicProfileChallenge => challenge !== null),
  };
}

export type SendContactRelayMessageInput = {
  senderUserId: string;
  recipientUsername: string;
  subject: string | null;
  body: string;
};

export type SendContactRelayMessageResult =
  | { outcome: "SENT" }
  | { outcome: "RECIPIENT_NOT_FOUND" }
  | { outcome: "NOT_CONTACTABLE" }
  | { outcome: "BLOCKED" }
  | { outcome: "SELF_CONTACT_NOT_ALLOWED" };

export async function sendContactRelayMessageInDb(
  input: SendContactRelayMessageInput,
): Promise<SendContactRelayMessageResult> {
  const recipient = await prisma.user.findUnique({
    where: {
      username: input.recipientUsername,
    },
    select: {
      id: true,
      isContactable: true,
    },
  });

  if (!recipient) {
    return { outcome: "RECIPIENT_NOT_FOUND" };
  }

  if (recipient.id === input.senderUserId) {
    return { outcome: "SELF_CONTACT_NOT_ALLOWED" };
  }

  const blockLink = await prisma.userBlock.findFirst({
    where: {
      OR: [
        {
          blockerUserId: input.senderUserId,
          blockedUserId: recipient.id,
        },
        {
          blockerUserId: recipient.id,
          blockedUserId: input.senderUserId,
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (blockLink) {
    return { outcome: "BLOCKED" };
  }

  if (!recipient.isContactable) {
    return { outcome: "NOT_CONTACTABLE" };
  }

  await prisma.contactRelayMessage.create({
    data: {
      senderUserId: input.senderUserId,
      recipientUserId: recipient.id,
      subject: input.subject,
      body: input.body,
      deliveryStatus: ContactRelayDeliveryStatus.QUEUED,
    },
  });

  return { outcome: "SENT" };
}

export async function setContactabilityInDb(input: { userId: string; isContactable: boolean }) {
  await prisma.user.update({
    where: {
      id: input.userId,
    },
    data: {
      isContactable: input.isContactable,
    },
  });
}

export async function getProfileSettingsSnapshotFromDb(userId: string) {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      username: true,
      isContactable: true,
    },
  });
}

export async function listBlockedUsersFromDb(userId: string) {
  return prisma.userBlock.findMany({
    where: {
      blockerUserId: userId,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      blockedUser: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      createdAt: true,
    },
  });
}

export async function blockUserByUsernameInDb(input: {
  blockerUserId: string;
  blockedUsername: string;
}) {
  const blockedUser = await prisma.user.findUnique({
    where: {
      username: input.blockedUsername,
    },
    select: {
      id: true,
    },
  });

  if (!blockedUser) {
    return { outcome: "NOT_FOUND" } as const;
  }

  if (blockedUser.id === input.blockerUserId) {
    return { outcome: "SELF_BLOCK_NOT_ALLOWED" } as const;
  }

  await prisma.userBlock.upsert({
    where: {
      blockerUserId_blockedUserId: {
        blockerUserId: input.blockerUserId,
        blockedUserId: blockedUser.id,
      },
    },
    update: {},
    create: {
      blockerUserId: input.blockerUserId,
      blockedUserId: blockedUser.id,
    },
  });

  return { outcome: "BLOCKED" } as const;
}

export async function unblockUserByIdInDb(input: { blockerUserId: string; blockedUserId: string }) {
  await prisma.userBlock.deleteMany({
    where: {
      blockerUserId: input.blockerUserId,
      blockedUserId: input.blockedUserId,
    },
  });
}
