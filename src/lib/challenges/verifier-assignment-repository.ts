import {
  ChallengeParticipantState,
  ChallengeVerifierAssignmentStatus,
  RunSubmissionStatus,
  VerifierPoolStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

type AssignmentCandidateBlockReason =
  | "SELF_ASSIGNMENT_BLOCKED"
  | "ALREADY_ASSIGNED"
  | "CONFLICT_ACTIVE_PARTICIPANT"
  | "CONFLICT_RUN_SUBMISSION";

export type ChallengeVerifierAssignmentCandidate = {
  userId: string;
  displayName: string;
  username: string;
  canAssign: boolean;
  blockReason: AssignmentCandidateBlockReason | null;
};

export type ChallengeVerifierAssignmentViewState = {
  challenge: {
    id: string;
    slug: string;
    title: string;
  };
  activeAssignments: Array<{
    id: string;
    assignedAt: Date;
    user: {
      id: string;
      displayName: string;
      username: string;
    };
  }>;
  candidates: ChallengeVerifierAssignmentCandidate[];
};

export async function getChallengeVerifierAssignmentViewStateFromDb(input: {
  challengeSlug: string;
  creatorUserId: string;
}): Promise<ChallengeVerifierAssignmentViewState | null> {
  const challenge = await prisma.challenge.findFirst({
    where: {
      slug: input.challengeSlug,
      creatorUserId: input.creatorUserId,
    },
    select: {
      id: true,
      slug: true,
      title: true,
    },
  });

  if (!challenge) {
    return null;
  }

  const [activeAssignments, activePoolMemberships, activeParticipants, challengeSubmissions] =
    await Promise.all([
      prisma.challengeVerifierAssignment.findMany({
        where: {
          challengeId: challenge.id,
          status: ChallengeVerifierAssignmentStatus.ACTIVE,
          endedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          id: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
            },
          },
        },
      }),
      prisma.verifierPoolMembership.findMany({
        where: {
          status: VerifierPoolStatus.ACTIVE,
          revokedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
        select: {
          userId: true,
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
            },
          },
        },
      }),
      prisma.challengeParticipant.findMany({
        where: {
          challengeId: challenge.id,
          state: ChallengeParticipantState.ACTIVE,
          leftAt: null,
        },
        select: {
          userId: true,
        },
      }),
      prisma.runSubmission.findMany({
        where: {
          challengeId: challenge.id,
          status: {
            notIn: [RunSubmissionStatus.DRAFT_UPLOAD, RunSubmissionStatus.WITHDRAWN],
          },
        },
        select: {
          userId: true,
        },
      }),
    ]);

  const activeAssignedUserIds = new Set(activeAssignments.map((assignment) => assignment.user.id));
  const activeParticipantUserIds = new Set(
    activeParticipants.map((participant) => participant.userId),
  );
  const submittedRunUserIds = new Set(challengeSubmissions.map((submission) => submission.userId));

  const candidates = activePoolMemberships.map((membership) => {
    const isSelf = membership.userId === input.creatorUserId;
    const isAlreadyAssigned = activeAssignedUserIds.has(membership.userId);
    const hasParticipantConflict = activeParticipantUserIds.has(membership.userId);
    const hasSubmissionConflict = submittedRunUserIds.has(membership.userId);

    let blockReason: AssignmentCandidateBlockReason | null = null;

    if (isSelf) {
      blockReason = "SELF_ASSIGNMENT_BLOCKED";
    } else if (isAlreadyAssigned) {
      blockReason = "ALREADY_ASSIGNED";
    } else if (hasParticipantConflict) {
      blockReason = "CONFLICT_ACTIVE_PARTICIPANT";
    } else if (hasSubmissionConflict) {
      blockReason = "CONFLICT_RUN_SUBMISSION";
    }

    return {
      userId: membership.user.id,
      displayName: membership.user.displayName,
      username: membership.user.username,
      canAssign: blockReason === null,
      blockReason,
    } satisfies ChallengeVerifierAssignmentCandidate;
  });

  return {
    challenge,
    activeAssignments: activeAssignments.map((assignment) => ({
      id: assignment.id,
      assignedAt: assignment.createdAt,
      user: assignment.user,
    })),
    candidates,
  };
}

export type AssignVerifierResult =
  | { outcome: "ASSIGNED" }
  | { outcome: "CHALLENGE_NOT_FOUND" }
  | { outcome: "CANDIDATE_NOT_ELIGIBLE" }
  | { outcome: "SELF_ASSIGNMENT_BLOCKED" }
  | { outcome: "CONFLICT_BLOCKED" }
  | { outcome: "ALREADY_ASSIGNED" };

export async function assignChallengeVerifierInDb(input: {
  challengeSlug: string;
  creatorUserId: string;
  verifierUserId: string;
}): Promise<AssignVerifierResult> {
  const challenge = await prisma.challenge.findFirst({
    where: {
      slug: input.challengeSlug,
      creatorUserId: input.creatorUserId,
    },
    select: {
      id: true,
    },
  });

  if (!challenge) {
    return { outcome: "CHALLENGE_NOT_FOUND" };
  }

  if (input.verifierUserId === input.creatorUserId) {
    return { outcome: "SELF_ASSIGNMENT_BLOCKED" };
  }

  return prisma.$transaction(async (tx) => {
    const activePoolMembership = await tx.verifierPoolMembership.findFirst({
      where: {
        userId: input.verifierUserId,
        status: VerifierPoolStatus.ACTIVE,
        revokedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!activePoolMembership) {
      return { outcome: "CANDIDATE_NOT_ELIGIBLE" } satisfies AssignVerifierResult;
    }

    const existingAssignment = await tx.challengeVerifierAssignment.findFirst({
      where: {
        challengeId: challenge.id,
        userId: input.verifierUserId,
        status: ChallengeVerifierAssignmentStatus.ACTIVE,
        endedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (existingAssignment) {
      return { outcome: "ALREADY_ASSIGNED" } satisfies AssignVerifierResult;
    }

    const [activeParticipant, submittedRun] = await Promise.all([
      tx.challengeParticipant.findFirst({
        where: {
          challengeId: challenge.id,
          userId: input.verifierUserId,
          state: ChallengeParticipantState.ACTIVE,
          leftAt: null,
        },
        select: {
          id: true,
        },
      }),
      tx.runSubmission.findFirst({
        where: {
          challengeId: challenge.id,
          userId: input.verifierUserId,
          status: {
            notIn: [RunSubmissionStatus.DRAFT_UPLOAD, RunSubmissionStatus.WITHDRAWN],
          },
        },
        select: {
          id: true,
        },
      }),
    ]);

    if (activeParticipant || submittedRun) {
      return { outcome: "CONFLICT_BLOCKED" } satisfies AssignVerifierResult;
    }

    await tx.challengeVerifierAssignment.create({
      data: {
        challengeId: challenge.id,
        userId: input.verifierUserId,
        assignedByUserId: input.creatorUserId,
        status: ChallengeVerifierAssignmentStatus.ACTIVE,
      },
    });

    return { outcome: "ASSIGNED" } satisfies AssignVerifierResult;
  });
}

export type RemoveVerifierResult =
  | { outcome: "REMOVED" }
  | { outcome: "CHALLENGE_NOT_FOUND" }
  | { outcome: "ASSIGNMENT_NOT_FOUND" }
  | { outcome: "ASSIGNMENT_NOT_ACTIVE" };

export async function removeChallengeVerifierAssignmentInDb(input: {
  challengeSlug: string;
  creatorUserId: string;
  assignmentId: string;
}): Promise<RemoveVerifierResult> {
  const challenge = await prisma.challenge.findFirst({
    where: {
      slug: input.challengeSlug,
      creatorUserId: input.creatorUserId,
    },
    select: {
      id: true,
    },
  });

  if (!challenge) {
    return { outcome: "CHALLENGE_NOT_FOUND" };
  }

  const existingAssignment = await prisma.challengeVerifierAssignment.findFirst({
    where: {
      id: input.assignmentId,
      challengeId: challenge.id,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!existingAssignment) {
    return { outcome: "ASSIGNMENT_NOT_FOUND" };
  }

  if (existingAssignment.status !== ChallengeVerifierAssignmentStatus.ACTIVE) {
    return { outcome: "ASSIGNMENT_NOT_ACTIVE" };
  }

  const updated = await prisma.challengeVerifierAssignment.updateMany({
    where: {
      id: input.assignmentId,
      challengeId: challenge.id,
      status: ChallengeVerifierAssignmentStatus.ACTIVE,
      endedAt: null,
    },
    data: {
      status: ChallengeVerifierAssignmentStatus.ENDED_BY_CREATOR,
      endedAt: new Date(),
      reason: "removed_by_creator",
    },
  });

  if (updated.count < 1) {
    return { outcome: "ASSIGNMENT_NOT_ACTIVE" };
  }

  return { outcome: "REMOVED" };
}
