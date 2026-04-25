import { ChallengeStatus, ChallengeVisibilityState, RunSubmissionStatus } from "@prisma/client";

import {
  reconcileChallengeLifecycleBySlugInDb,
  reconcileDueChallengeLifecycleTransitionsInDb,
} from "@/lib/challenges/state-transition-repository";
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
  await reconcileDueChallengeLifecycleTransitionsInDb();

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

export type PublicLeaderboardEntry = {
  rank: number;
  userId: string;
  displayName: string;
  username: string;
  bestSubmissionId: string;
  primaryScore: number;
  submittedAt: Date;
};

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
  leaderboardEntries: PublicLeaderboardEntry[];
};

function getPrimaryScore(scorePayload: unknown): number | null {
  if (!scorePayload || typeof scorePayload !== "object") {
    return null;
  }

  const value = (scorePayload as { primaryScore?: unknown }).primaryScore;

  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function getPublicChallengeDetailBySlugFromDb(
  slug: string,
): Promise<PublicChallengeDetail | null> {
  await reconcileChallengeLifecycleBySlugInDb({ challengeSlug: slug });

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
      runSubmissions: {
        where: {
          status: RunSubmissionStatus.VERIFIED,
        },
        select: {
          id: true,
          submittedAt: true,
          scorePayload: true,
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
            },
          },
        },
      },
    },
  });

  if (!challenge?.lastApprovedVersion) {
    return null;
  }

  const bestVerifiedByUser = new Map<
    string,
    {
      bestSubmissionId: string;
      primaryScore: number;
      submittedAt: Date;
      userId: string;
      displayName: string;
      username: string;
    }
  >();

  for (const submission of challenge.runSubmissions) {
    const primaryScore = getPrimaryScore(submission.scorePayload);

    if (primaryScore === null) {
      continue;
    }

    const existing = bestVerifiedByUser.get(submission.user.id);

    if (!existing) {
      bestVerifiedByUser.set(submission.user.id, {
        bestSubmissionId: submission.id,
        primaryScore,
        submittedAt: submission.submittedAt,
        userId: submission.user.id,
        displayName: submission.user.displayName,
        username: submission.user.username,
      });
      continue;
    }

    if (primaryScore > existing.primaryScore) {
      bestVerifiedByUser.set(submission.user.id, {
        bestSubmissionId: submission.id,
        primaryScore,
        submittedAt: submission.submittedAt,
        userId: submission.user.id,
        displayName: submission.user.displayName,
        username: submission.user.username,
      });
      continue;
    }

    if (primaryScore === existing.primaryScore && submission.submittedAt < existing.submittedAt) {
      bestVerifiedByUser.set(submission.user.id, {
        bestSubmissionId: submission.id,
        primaryScore,
        submittedAt: submission.submittedAt,
        userId: submission.user.id,
        displayName: submission.user.displayName,
        username: submission.user.username,
      });
    }
  }

  const leaderboardEntries = Array.from(bestVerifiedByUser.values())
    .sort((a, b) => {
      if (b.primaryScore !== a.primaryScore) {
        return b.primaryScore - a.primaryScore;
      }

      if (a.submittedAt.getTime() !== b.submittedAt.getTime()) {
        return a.submittedAt.getTime() - b.submittedAt.getTime();
      }

      return a.bestSubmissionId.localeCompare(b.bestSubmissionId);
    })
    .map((entry, index) => ({
      rank: index + 1,
      userId: entry.userId,
      displayName: entry.displayName,
      username: entry.username,
      bestSubmissionId: entry.bestSubmissionId,
      primaryScore: entry.primaryScore,
      submittedAt: entry.submittedAt,
    }));

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
    leaderboardEntries,
  } satisfies PublicChallengeDetail;
}
