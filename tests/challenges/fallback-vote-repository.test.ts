import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  ChallengeStatus: {
    CLOSED: "CLOSED",
  },
  RunSubmissionStatus: {
    SUBMITTED: "SUBMITTED",
    UNDER_REVIEW: "UNDER_REVIEW",
  },
  ParticipantVerificationVoteStatus: {
    OPEN: "OPEN",
    PASSED: "PASSED",
    FAILED: "FAILED",
  },
  ParticipantVerificationVoteBallotValue: {
    YES: "YES",
    NO: "NO",
  },
  PlatformRoleType: {
    SITE_ADMIN: "SITE_ADMIN",
    SUPER_ADMIN: "SUPER_ADMIN",
  },
  NotificationType: {
    FALLBACK_VOTE_OPENED: "FALLBACK_VOTE_OPENED",
    FALLBACK_VOTE_CLOSED: "FALLBACK_VOTE_CLOSED",
  },
  ChallengeParticipantState: {
    ACTIVE: "ACTIVE",
  },
  ChallengeVerifierAssignmentStatus: {
    ACTIVE: "ACTIVE",
  },
  AuditActorType: {
    SYSTEM: "SYSTEM",
    USER: "USER",
  },
  AuditObjectType: {
    PARTICIPANT_VERIFICATION_VOTE: "PARTICIPANT_VERIFICATION_VOTE",
  },
  AuditActionType: {
    OPEN: "OPEN",
    CLOSE: "CLOSE",
  },
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    challenge: {
      findUnique: vi.fn(),
    },
    challengeParticipant: {
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    participantVerificationVote: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

import {
  castFallbackVoteBallotInDb,
  ensureFallbackVoteOpenedForChallengeInTx,
} from "@/lib/challenges/fallback-vote-repository";

describe("fallback vote repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("opens vote only when challenge is closed with unresolved runs and no active verifiers", async () => {
    const tx = {
      challenge: {
        findUnique: vi.fn().mockResolvedValue({
          id: "challenge_1",
          slug: "challenge-1",
          status: "CLOSED",
        }),
      },
      runSubmission: {
        count: vi.fn().mockResolvedValue(2),
      },
      challengeVerifierAssignment: {
        count: vi.fn().mockResolvedValue(0),
      },
      participantVerificationVote: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "vote_1" }),
      },
      challengeParticipant: {
        findMany: vi.fn().mockResolvedValue([{ userId: "participant_1" }]),
      },
      roleAssignment: {
        findMany: vi.fn().mockResolvedValue([{ userId: "admin_1" }]),
      },
      notification: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit_1" }),
      },
    };

    const result = await ensureFallbackVoteOpenedForChallengeInTx({
      challengeId: "challenge_1",
      tx: tx as never,
    });

    expect(result).toEqual({ opened: true, voteId: "vote_1" });
    expect(tx.participantVerificationVote.create).toHaveBeenCalled();

    tx.runSubmission.count.mockResolvedValueOnce(0);

    const noOpenResult = await ensureFallbackVoteOpenedForChallengeInTx({
      challengeId: "challenge_1",
      tx: tx as never,
    });

    expect(noOpenResult).toEqual({ opened: false, voteId: null });
  });

  it("passes vote only above 50% of all participants and with at least 3 participants", async () => {
    prismaMock.challenge.findUnique.mockResolvedValue({
      id: "challenge_1",
      slug: "challenge-1",
    });
    prismaMock.challengeParticipant.findFirst.mockResolvedValue({ id: "participant_row_1" });

    const tx = {
      participantVerificationVote: {
        findFirst: vi.fn().mockResolvedValue({ id: "vote_1" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      participantVerificationVoteBallot: {
        upsert: vi.fn().mockResolvedValue({ id: "ballot_1" }),
        count: vi
          .fn()
          .mockResolvedValueOnce(4)
          .mockResolvedValueOnce(4)
          .mockResolvedValueOnce(3)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(2),
      },
      challengeParticipant: {
        count: vi.fn().mockResolvedValueOnce(4).mockResolvedValueOnce(2),
        findMany: vi.fn().mockResolvedValue([{ userId: "participant_1" }]),
      },
      roleAssignment: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      notification: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit_1" }),
      },
    };

    prismaMock.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
      callback(tx),
    );

    const passResult = await castFallbackVoteBallotInDb({
      challengeSlug: "challenge-1",
      actorUserId: "user_1",
      value: "YES" as never,
    });

    expect(passResult).toMatchObject({
      outcome: "BALLOT_RECORDED",
      voteStatus: "PASSED",
      participantCount: 4,
    });

    const belowMinimumResult = await castFallbackVoteBallotInDb({
      challengeSlug: "challenge-1",
      actorUserId: "user_1",
      value: "YES" as never,
    });

    expect(belowMinimumResult).toMatchObject({
      outcome: "BALLOT_RECORDED",
      voteStatus: "FAILED",
      participantCount: 2,
    });
  });
});
