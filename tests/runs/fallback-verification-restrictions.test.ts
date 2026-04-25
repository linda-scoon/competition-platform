import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  ChallengeVerifierAssignmentStatus: {
    ACTIVE: "ACTIVE",
  },
  ParticipantVerificationVoteStatus: {
    PASSED: "PASSED",
  },
  ChallengeParticipantState: {
    ACTIVE: "ACTIVE",
  },
  RunSubmissionStatus: {
    SUBMITTED: "SUBMITTED",
    UNDER_REVIEW: "UNDER_REVIEW",
    VERIFIED: "VERIFIED",
    REJECTED: "REJECTED",
    CORRECTION_REQUESTED: "CORRECTION_REQUESTED",
  },
  VerificationDecisionType: {
    APPROVE: "APPROVE",
    REJECT: "REJECT",
    CORRECTION_REQUESTED: "CORRECTION_REQUESTED",
  },
  VerificationDecisionMode: {
    NORMAL_VERIFIER: "NORMAL_VERIFIER",
    FALLBACK_PARTICIPANT: "FALLBACK_PARTICIPANT",
  },
  NotificationType: {
    RUN_DECISION_RECORDED: "RUN_DECISION_RECORDED",
  },
}));

const { prismaMock, adminAuthorityMock } = vi.hoisted(() => ({
  prismaMock: {
    challenge: {
      findUnique: vi.fn(),
    },
    challengeVerifierAssignment: {
      findFirst: vi.fn(),
    },
    participantVerificationVote: {
      findFirst: vi.fn(),
    },
    challengeParticipant: {
      findFirst: vi.fn(),
    },
    runSubmission: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
  adminAuthorityMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth/authorization", () => ({
  userHasAdminVerifierReviewAuthority: adminAuthorityMock,
}));
vi.mock("@/lib/challenges/state-transition-repository", () => ({
  reconcileChallengeLifecycleByIdInDb: vi.fn().mockResolvedValue({}),
}));

import { claimReviewSubmissionInDb } from "@/lib/runs/review-queue-repository";
import { recordVerificationDecisionInDb } from "@/lib/runs/verification-decision-repository";

describe("fallback verification restrictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminAuthorityMock.mockResolvedValue(false);
  });

  it("blocks fallback participants from claiming their own submission", async () => {
    prismaMock.challenge.findUnique.mockResolvedValue({ id: "challenge_1" });
    prismaMock.challengeVerifierAssignment.findFirst.mockResolvedValue(null);
    prismaMock.participantVerificationVote.findFirst.mockResolvedValue({ id: "vote_1" });
    prismaMock.challengeParticipant.findFirst.mockResolvedValue({ id: "participant_1" });
    prismaMock.runSubmission.findFirst.mockResolvedValue({
      id: "submission_1",
      userId: "user_1",
      claimedByVerifierUserId: null,
    });

    const result = await claimReviewSubmissionInDb({
      challengeSlug: "challenge-1",
      submissionId: "submission_1",
      actorUserId: "user_1",
    });

    expect(result).toEqual({ outcome: "SELF_VERIFICATION_FORBIDDEN" });
  });

  it("blocks fallback participants from deciding their own claimed submission", async () => {
    prismaMock.challenge.findUnique.mockResolvedValue({ id: "challenge_1" });
    prismaMock.challengeVerifierAssignment.findFirst.mockResolvedValue(null);
    prismaMock.participantVerificationVote.findFirst.mockResolvedValue({ id: "vote_1" });
    prismaMock.challengeParticipant.findFirst.mockResolvedValue({ id: "participant_1" });

    const tx = {
      runSubmission: {
        findFirst: vi.fn().mockResolvedValue({
          id: "submission_1",
          userId: "user_1",
          challengeId: "challenge_1",
          claimedByVerifierUserId: "user_1",
        }),
        update: vi.fn(),
      },
      verificationDecision: {
        create: vi.fn(),
      },
      notification: {
        create: vi.fn(),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx),
    );

    const result = await recordVerificationDecisionInDb({
      challengeSlug: "challenge-1",
      submissionId: "submission_1",
      actorUserId: "user_1",
      decisionType: "APPROVE" as never,
    });

    expect(result).toEqual({ outcome: "SELF_VERIFICATION_FORBIDDEN" });
    expect(tx.verificationDecision.create).not.toHaveBeenCalled();
  });
});
