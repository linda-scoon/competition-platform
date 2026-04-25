import {
  AuditActionType,
  AuditActorType,
  AuditObjectType,
  ChallengeVerifierAssignmentStatus,
  Prisma,
} from "@prisma/client";

type AutoRemoveVerifierAssignmentForConflictInput = {
  tx: Prisma.TransactionClient;
  challengeId: string;
  verifierUserId: string;
  triggeredBy: "participant_join" | "run_submission";
  triggerObjectId: string;
};

export async function autoRemoveVerifierAssignmentForConflictInDb(
  input: AutoRemoveVerifierAssignmentForConflictInput,
): Promise<{ removed: boolean; assignmentId: string | null }> {
  const activeAssignment = await input.tx.challengeVerifierAssignment.findFirst({
    where: {
      challengeId: input.challengeId,
      userId: input.verifierUserId,
      status: ChallengeVerifierAssignmentStatus.ACTIVE,
      endedAt: null,
    },
    select: {
      id: true,
    },
  });

  if (!activeAssignment) {
    return {
      removed: false,
      assignmentId: null,
    };
  }

  const endedAt = new Date();
  const removalReason =
    input.triggeredBy === "participant_join"
      ? "auto_removed_on_participant_join_conflict"
      : "auto_removed_on_run_submission_conflict";

  const updated = await input.tx.challengeVerifierAssignment.updateMany({
    where: {
      id: activeAssignment.id,
      status: ChallengeVerifierAssignmentStatus.ACTIVE,
      endedAt: null,
    },
    data: {
      status: ChallengeVerifierAssignmentStatus.ENDED_BY_CONFLICT,
      endedAt,
      reason: removalReason,
    },
  });

  if (updated.count < 1) {
    return {
      removed: false,
      assignmentId: null,
    };
  }

  await input.tx.auditLog.create({
    data: {
      actorUserId: input.verifierUserId,
      actorType: AuditActorType.USER,
      objectType: AuditObjectType.CHALLENGE_VERIFIER_ASSIGNMENT,
      objectId: activeAssignment.id,
      actionType: AuditActionType.REMOVE,
      reason: "verifier_assignment_auto_removed_on_conflict",
      metadata: {
        challengeId: input.challengeId,
        verifierUserId: input.verifierUserId,
        assignmentId: activeAssignment.id,
        triggeredBy: input.triggeredBy,
        triggerObjectId: input.triggerObjectId,
        endedStatus: ChallengeVerifierAssignmentStatus.ENDED_BY_CONFLICT,
      },
    },
  });

  return {
    removed: true,
    assignmentId: activeAssignment.id,
  };
}
