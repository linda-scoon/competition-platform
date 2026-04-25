import {
  ChallengeParticipantState,
  ChallengeVerifierAssignmentStatus,
  ParticipantVerificationVoteStatus,
  RunSubmissionStatus,
} from "@prisma/client";

import { userHasAdminVerifierReviewAuthority } from "@/lib/auth/authorization";
import { prisma } from "@/lib/db/prisma";

const REVIEW_QUEUE_SUBMISSION_STATUSES = [
  RunSubmissionStatus.SUBMITTED,
  RunSubmissionStatus.UNDER_REVIEW,
] as const;

type ReviewQueueSubmission = {
  id: string;
  submittedAt: Date;
  status: RunSubmissionStatus;
  videoUrl: string;
  scorePayload: unknown;
  user: {
    id: string;
    displayName: string;
    username: string;
  };
};

export type ReviewQueueViewState = {
  challenge: {
    id: string;
    slug: string;
    title: string;
  };
  access: {
    isAssignedVerifier: boolean;
    isAdminAuthority: boolean;
    isFallbackParticipant: boolean;
  };
  unclaimedSubmissions: Array<ReviewQueueSubmission>;
  claimedByYou: Array<ReviewQueueSubmission>;
  claimedByOtherVerifiers: Array<
    ReviewQueueSubmission & {
      claimedByVerifier: {
        id: string;
        displayName: string;
        username: string;
      };
      claimedAt: Date;
    }
  >;
};

export type GetReviewQueueResult =
  | { outcome: "NOT_FOUND" }
  | { outcome: "FORBIDDEN" }
  | { outcome: "VISIBLE"; viewState: ReviewQueueViewState };

async function getQueueAccess(input: { challengeId: string; actorUserId: string }) {
  const [isAdminAuthority, activeAssignment, activeFallbackVote, activeParticipant] =
    await Promise.all([
      userHasAdminVerifierReviewAuthority(input.actorUserId),
      prisma.challengeVerifierAssignment.findFirst({
        where: {
          challengeId: input.challengeId,
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
          challengeId: input.challengeId,
          status: ParticipantVerificationVoteStatus.PASSED,
        },
        select: {
          id: true,
        },
      }),
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
    ]);

  const isFallbackParticipant = Boolean(activeFallbackVote) && Boolean(activeParticipant);

  return {
    isAdminAuthority,
    isAssignedVerifier: Boolean(activeAssignment),
    isFallbackParticipant,
    canAccessQueue: Boolean(activeAssignment) || isAdminAuthority || isFallbackParticipant,
  };
}

export async function getReviewQueueViewStateFromDb(input: {
  challengeSlug: string;
  actorUserId: string;
}): Promise<GetReviewQueueResult> {
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

  const access = await getQueueAccess({
    challengeId: challenge.id,
    actorUserId: input.actorUserId,
  });

  if (!access.canAccessQueue) {
    return { outcome: "FORBIDDEN" };
  }

  const submissions = await prisma.runSubmission.findMany({
    where: {
      challengeId: challenge.id,
      status: {
        in: [...REVIEW_QUEUE_SUBMISSION_STATUSES],
      },
      resolvedAt: null,
    },
    orderBy: {
      submittedAt: "asc",
    },
    select: {
      id: true,
      submittedAt: true,
      status: true,
      videoUrl: true,
      scorePayload: true,
      claimedAt: true,
      user: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
      claimedByVerifierUser: {
        select: {
          id: true,
          displayName: true,
          username: true,
        },
      },
    },
  });

  return {
    outcome: "VISIBLE",
    viewState: {
      challenge,
      access: {
        isAssignedVerifier: access.isAssignedVerifier,
        isAdminAuthority: access.isAdminAuthority,
        isFallbackParticipant: access.isFallbackParticipant,
      },
      unclaimedSubmissions: submissions.filter(
        (submission) =>
          submission.claimedByVerifierUser === null &&
          !(access.isFallbackParticipant && submission.user.id === input.actorUserId),
      ),
      claimedByYou: submissions.filter(
        (submission) => submission.claimedByVerifierUser?.id === input.actorUserId,
      ),
      claimedByOtherVerifiers: submissions.filter(
        (submission) =>
          submission.claimedByVerifierUser !== null &&
          submission.claimedByVerifierUser.id !== input.actorUserId &&
          submission.claimedAt !== null,
      ) as ReviewQueueViewState["claimedByOtherVerifiers"],
    },
  };
}

export type ClaimReviewSubmissionResult =
  | { outcome: "SUBMISSION_NOT_FOUND" }
  | { outcome: "FORBIDDEN" }
  | { outcome: "SELF_VERIFICATION_FORBIDDEN" }
  | { outcome: "ALREADY_CLAIMED_BY_YOU" }
  | { outcome: "ALREADY_CLAIMED_BY_OTHER" }
  | { outcome: "CLAIMED" };

export async function claimReviewSubmissionInDb(input: {
  challengeSlug: string;
  submissionId: string;
  actorUserId: string;
}): Promise<ClaimReviewSubmissionResult> {
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

  const access = await getQueueAccess({
    challengeId: challenge.id,
    actorUserId: input.actorUserId,
  });

  if (!access.canAccessQueue) {
    return { outcome: "FORBIDDEN" };
  }

  const existing = await prisma.runSubmission.findFirst({
    where: {
      id: input.submissionId,
      challengeId: challenge.id,
      status: {
        in: [...REVIEW_QUEUE_SUBMISSION_STATUSES],
      },
      resolvedAt: null,
    },
    select: {
      id: true,
      userId: true,
      claimedByVerifierUserId: true,
    },
  });

  if (!existing) {
    return { outcome: "SUBMISSION_NOT_FOUND" };
  }

  if (access.isFallbackParticipant && existing.userId === input.actorUserId) {
    return { outcome: "SELF_VERIFICATION_FORBIDDEN" };
  }

  if (existing.claimedByVerifierUserId === input.actorUserId) {
    return { outcome: "ALREADY_CLAIMED_BY_YOU" };
  }

  if (existing.claimedByVerifierUserId !== null) {
    return { outcome: "ALREADY_CLAIMED_BY_OTHER" };
  }

  const updateResult = await prisma.runSubmission.updateMany({
    where: {
      id: input.submissionId,
      challengeId: challenge.id,
      claimedByVerifierUserId: null,
      resolvedAt: null,
      status: {
        in: [...REVIEW_QUEUE_SUBMISSION_STATUSES],
      },
    },
    data: {
      claimedByVerifierUserId: input.actorUserId,
      claimedAt: new Date(),
      status: RunSubmissionStatus.UNDER_REVIEW,
    },
  });

  if (updateResult.count < 1) {
    return { outcome: "ALREADY_CLAIMED_BY_OTHER" };
  }

  return { outcome: "CLAIMED" };
}

export type ReleaseReviewClaimResult =
  | { outcome: "SUBMISSION_NOT_FOUND" }
  | { outcome: "FORBIDDEN" }
  | { outcome: "NOT_CLAIMED" }
  | { outcome: "RELEASED" };

export async function releaseReviewClaimInDb(input: {
  challengeSlug: string;
  submissionId: string;
  actorUserId: string;
}): Promise<ReleaseReviewClaimResult> {
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

  const access = await getQueueAccess({
    challengeId: challenge.id,
    actorUserId: input.actorUserId,
  });

  if (!access.canAccessQueue) {
    return { outcome: "FORBIDDEN" };
  }

  const submission = await prisma.runSubmission.findFirst({
    where: {
      id: input.submissionId,
      challengeId: challenge.id,
      status: {
        in: [...REVIEW_QUEUE_SUBMISSION_STATUSES],
      },
      resolvedAt: null,
    },
    select: {
      id: true,
      claimedByVerifierUserId: true,
    },
  });

  if (!submission) {
    return { outcome: "SUBMISSION_NOT_FOUND" };
  }

  if (submission.claimedByVerifierUserId === null) {
    return { outcome: "NOT_CLAIMED" };
  }

  const canRelease =
    submission.claimedByVerifierUserId === input.actorUserId || access.isAdminAuthority;

  if (!canRelease) {
    return { outcome: "FORBIDDEN" };
  }

  const updateResult = await prisma.runSubmission.updateMany({
    where: {
      id: input.submissionId,
      challengeId: challenge.id,
      claimedByVerifierUserId: submission.claimedByVerifierUserId,
      resolvedAt: null,
      status: {
        in: [...REVIEW_QUEUE_SUBMISSION_STATUSES],
      },
    },
    data: {
      claimedByVerifierUserId: null,
      claimedAt: null,
      status: RunSubmissionStatus.SUBMITTED,
    },
  });

  if (updateResult.count < 1) {
    return { outcome: "NOT_CLAIMED" };
  }

  return { outcome: "RELEASED" };
}
