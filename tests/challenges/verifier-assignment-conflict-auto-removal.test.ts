import { describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  ChallengeVerifierAssignmentStatus: {
    ACTIVE: "ACTIVE",
    ENDED_BY_CONFLICT: "ENDED_BY_CONFLICT",
  },
  AuditActorType: {
    USER: "USER",
  },
  AuditObjectType: {
    CHALLENGE_VERIFIER_ASSIGNMENT: "CHALLENGE_VERIFIER_ASSIGNMENT",
  },
  AuditActionType: {
    REMOVE: "REMOVE",
  },
}));

import { autoRemoveVerifierAssignmentForConflictInDb } from "@/lib/challenges/verifier-assignment-conflict-repository";

describe("autoRemoveVerifierAssignmentForConflictInDb", () => {
  it("returns removed false when there is no active assignment", async () => {
    const tx = {
      challengeVerifierAssignment: {
        findFirst: vi.fn().mockResolvedValue(null),
        updateMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    const result = await autoRemoveVerifierAssignmentForConflictInDb({
      tx: tx as never,
      challengeId: "challenge_1",
      verifierUserId: "user_1",
      triggeredBy: "participant_join",
      triggerObjectId: "participant_1",
    });

    expect(result).toEqual({
      removed: false,
      assignmentId: null,
    });
    expect(tx.challengeVerifierAssignment.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("returns removed false when assignment update loses race", async () => {
    const tx = {
      challengeVerifierAssignment: {
        findFirst: vi.fn().mockResolvedValue({ id: "assignment_1" }),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      auditLog: {
        create: vi.fn(),
      },
    };

    const result = await autoRemoveVerifierAssignmentForConflictInDb({
      tx: tx as never,
      challengeId: "challenge_1",
      verifierUserId: "user_1",
      triggeredBy: "run_submission",
      triggerObjectId: "submission_1",
    });

    expect(result).toEqual({
      removed: false,
      assignmentId: null,
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it("ends active assignment by conflict and writes audit log", async () => {
    const tx = {
      challengeVerifierAssignment: {
        findFirst: vi.fn().mockResolvedValue({ id: "assignment_1" }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: "audit_1" }),
      },
    };

    const result = await autoRemoveVerifierAssignmentForConflictInDb({
      tx: tx as never,
      challengeId: "challenge_1",
      verifierUserId: "user_1",
      triggeredBy: "participant_join",
      triggerObjectId: "participant_1",
    });

    expect(result).toEqual({
      removed: true,
      assignmentId: "assignment_1",
    });
    expect(tx.challengeVerifierAssignment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "ENDED_BY_CONFLICT",
          reason: "auto_removed_on_participant_join_conflict",
        }),
      }),
    );
    expect(tx.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          objectId: "assignment_1",
          reason: "verifier_assignment_auto_removed_on_conflict",
          metadata: expect.objectContaining({
            triggeredBy: "participant_join",
            triggerObjectId: "participant_1",
          }),
        }),
      }),
    );
  });
});
