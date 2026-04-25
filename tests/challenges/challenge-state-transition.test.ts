import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  ChallengeStatus: {
    PUBLISHED_UNLOCKED: "PUBLISHED_UNLOCKED",
    PUBLISHED_SOFT_LOCKED: "PUBLISHED_SOFT_LOCKED",
    ACTIVE_FULLY_LOCKED: "ACTIVE_FULLY_LOCKED",
    CLOSED: "CLOSED",
    FINALIZED: "FINALIZED",
  },
  RunSubmissionStatus: {
    SUBMITTED: "SUBMITTED",
    UNDER_REVIEW: "UNDER_REVIEW",
  },
  AuditActorType: {
    SYSTEM: "SYSTEM",
  },
  AuditObjectType: {
    CHALLENGE: "CHALLENGE",
  },
  AuditActionType: {
    UPDATE: "UPDATE",
  },
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    challenge: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

import { reconcileChallengeLifecycleByIdInDb } from "@/lib/challenges/state-transition-repository";

function setupTx(input: {
  challenge: {
    id: string;
    status: string;
    submissionOpensAt: Date;
    submissionClosesAt: Date;
    resultsFinalizedAt: Date | null;
  };
  updateManyCounts?: number[];
  unresolvedCount?: number;
}) {
  const tx = {
    challenge: {
      findUnique: vi.fn().mockResolvedValue(input.challenge),
      updateMany: vi
        .fn()
        .mockResolvedValueOnce({ count: input.updateManyCounts?.[0] ?? 1 })
        .mockResolvedValueOnce({ count: input.updateManyCounts?.[1] ?? 1 }),
    },
    runSubmission: {
      count: vi.fn().mockResolvedValue(input.unresolvedCount ?? 0),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit_1" }),
    },
  };

  prismaMock.$transaction.mockImplementation(async (callback: (txArg: typeof tx) => unknown) =>
    callback(tx),
  );

  return tx;
}

describe("challenge lifecycle transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions to full lock when submission window opens", async () => {
    const now = new Date("2026-05-01T12:00:00.000Z");

    const tx = setupTx({
      challenge: {
        id: "challenge_1",
        status: "PUBLISHED_SOFT_LOCKED",
        submissionOpensAt: new Date("2026-05-01T00:00:00.000Z"),
        submissionClosesAt: new Date("2026-05-10T00:00:00.000Z"),
        resultsFinalizedAt: null,
      },
      updateManyCounts: [1, 0],
    });

    const result = await reconcileChallengeLifecycleByIdInDb({
      challengeId: "challenge_1",
      now,
    });

    expect(result).toEqual({
      transitionedToFullLock: true,
      transitionedToClosed: false,
      transitionedToFinalized: false,
    });
    expect(tx.challenge.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ACTIVE_FULLY_LOCKED",
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reason: "challenge_full_locked_on_submission_window_open",
        }),
      }),
    );
  });

  it("transitions to closed and finalized when window is closed and runs are resolved", async () => {
    const now = new Date("2026-05-12T00:00:00.000Z");

    const tx = setupTx({
      challenge: {
        id: "challenge_2",
        status: "ACTIVE_FULLY_LOCKED",
        submissionOpensAt: new Date("2026-05-01T00:00:00.000Z"),
        submissionClosesAt: new Date("2026-05-10T00:00:00.000Z"),
        resultsFinalizedAt: null,
      },
      updateManyCounts: [1, 1],
      unresolvedCount: 0,
    });

    const result = await reconcileChallengeLifecycleByIdInDb({
      challengeId: "challenge_2",
      now,
    });

    expect(result).toEqual({
      transitionedToFullLock: false,
      transitionedToClosed: true,
      transitionedToFinalized: true,
    });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(2);
    expect(tx.auditLog.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          reason: "challenge_finalized_on_review_resolution",
          metadata: expect.objectContaining({
            nextStatus: "FINALIZED",
          }),
        }),
      }),
    );
  });

  it("does not finalize while unresolved reviewable runs remain", async () => {
    const now = new Date("2026-05-12T00:00:00.000Z");

    const tx = setupTx({
      challenge: {
        id: "challenge_3",
        status: "CLOSED",
        submissionOpensAt: new Date("2026-05-01T00:00:00.000Z"),
        submissionClosesAt: new Date("2026-05-10T00:00:00.000Z"),
        resultsFinalizedAt: null,
      },
      updateManyCounts: [0, 0],
      unresolvedCount: 2,
    });

    const result = await reconcileChallengeLifecycleByIdInDb({
      challengeId: "challenge_3",
      now,
    });

    expect(result).toEqual({
      transitionedToFullLock: false,
      transitionedToClosed: false,
      transitionedToFinalized: false,
    });
    expect(tx.runSubmission.count).toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
