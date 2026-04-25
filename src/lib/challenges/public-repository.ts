import { ChallengeStatus, ChallengeVisibilityState } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const PUBLIC_DIRECTORY_STATUSES = [
  ChallengeStatus.PUBLISHED_UNLOCKED,
  ChallengeStatus.PUBLISHED_SOFT_LOCKED,
  ChallengeStatus.ACTIVE_FULLY_LOCKED,
  ChallengeStatus.CLOSED,
  ChallengeStatus.FINALIZED,
] as const;

const PUBLIC_CHALLENGE_WHERE = {
  isPublic: true,
  visibilityState: ChallengeVisibilityState.PUBLIC,
  lastApprovedVersionId: {
    not: null,
  },
  status: {
    in: [...PUBLIC_DIRECTORY_STATUSES],
  },
} as const;

export type PublicChallengeDirectoryItem = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  status: ChallengeStatus;
  submissionOpensAt: Date;
  submissionClosesAt: Date;
  creatorDisplayName: string;
};

export async function getPublicChallengeDirectoryFromDb(): Promise<PublicChallengeDirectoryItem[]> {
  const challenges = await prisma.challenge.findMany({
    where: PUBLIC_CHALLENGE_WHERE,
    orderBy: [{ submissionOpensAt: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      slug: true,
      status: true,
      submissionOpensAt: true,
      submissionClosesAt: true,
      creator: {
        select: {
          displayName: true,
        },
      },
      lastApprovedVersion: {
        select: {
          title: true,
          shortDescription: true,
        },
      },
    },
  });

  return challenges
    .map((challenge) => {
      if (!challenge.lastApprovedVersion) {
        return null;
      }

      return {
        id: challenge.id,
        slug: challenge.slug,
        title: challenge.lastApprovedVersion.title,
        shortDescription: challenge.lastApprovedVersion.shortDescription,
        status: challenge.status,
        submissionOpensAt: challenge.submissionOpensAt,
        submissionClosesAt: challenge.submissionClosesAt,
        creatorDisplayName: challenge.creator.displayName,
      } satisfies PublicChallengeDirectoryItem;
    })
    .filter((challenge): challenge is PublicChallengeDirectoryItem => challenge !== null);
}

export type PublicChallengeDetail = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  status: ChallengeStatus;
  submissionOpensAt: Date;
  submissionClosesAt: Date;
  creatorDisplayName: string;
  rulesSnapshot: unknown;
  scoringSnapshot: unknown;
  evidencePolicySnapshot: unknown;
};

export async function getPublicChallengeDetailBySlugFromDb(
  slug: string,
): Promise<PublicChallengeDetail | null> {
  const challenge = await prisma.challenge.findFirst({
    where: {
      ...PUBLIC_CHALLENGE_WHERE,
      slug,
    },
    select: {
      id: true,
      slug: true,
      status: true,
      submissionOpensAt: true,
      submissionClosesAt: true,
      creator: {
        select: {
          displayName: true,
        },
      },
      lastApprovedVersion: {
        select: {
          title: true,
          shortDescription: true,
          longDescription: true,
          rulesSnapshot: true,
          scoringSnapshot: true,
          evidencePolicySnapshot: true,
        },
      },
    },
  });

  if (!challenge?.lastApprovedVersion) {
    return null;
  }

  return {
    id: challenge.id,
    slug: challenge.slug,
    title: challenge.lastApprovedVersion.title,
    shortDescription: challenge.lastApprovedVersion.shortDescription,
    longDescription: challenge.lastApprovedVersion.longDescription,
    status: challenge.status,
    submissionOpensAt: challenge.submissionOpensAt,
    submissionClosesAt: challenge.submissionClosesAt,
    creatorDisplayName: challenge.creator.displayName,
    rulesSnapshot: challenge.lastApprovedVersion.rulesSnapshot,
    scoringSnapshot: challenge.lastApprovedVersion.scoringSnapshot,
    evidencePolicySnapshot: challenge.lastApprovedVersion.evidencePolicySnapshot,
  } satisfies PublicChallengeDetail;
}
