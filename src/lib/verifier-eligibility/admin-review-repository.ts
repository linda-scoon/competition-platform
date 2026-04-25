import {
  AuditActionType,
  AuditActorType,
  AuditObjectType,
  VerifierPoolStatus,
  VerifierRequestStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type PendingVerifierEligibilityRequest = {
  id: string;
  reasonText: string;
  createdAt: Date;
  user: {
    id: string;
    username: string;
    displayName: string;
    email: string;
  };
};

export async function listPendingVerifierEligibilityRequests(): Promise<PendingVerifierEligibilityRequest[]> {
  return prisma.verifierEligibilityRequest.findMany({
    where: {
      status: VerifierRequestStatus.PENDING,
    },
    orderBy: {
      createdAt: "asc",
    },
    select: {
      id: true,
      reasonText: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
        },
      },
    },
  });
}

export type AdminVerifierRequestDecisionResult =
  | { outcome: "APPROVED"; membershipCreated: boolean }
  | { outcome: "REJECTED"; membershipRevoked: boolean }
  | { outcome: "REQUEST_NOT_FOUND" }
  | { outcome: "REQUEST_NOT_PENDING" };

export async function approveVerifierEligibilityRequestInDb(params: {
  requestId: string;
  decidedByUserId: string;
  decisionNote?: string;
}): Promise<AdminVerifierRequestDecisionResult> {
  const { requestId, decidedByUserId, decisionNote } = params;

  const request = await prisma.verifierEligibilityRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true },
  });

  if (!request) {
    return { outcome: "REQUEST_NOT_FOUND" };
  }

  if (request.status !== VerifierRequestStatus.PENDING) {
    return { outcome: "REQUEST_NOT_PENDING" };
  }

  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.verifierEligibilityRequest.updateMany({
      where: {
        id: requestId,
        status: VerifierRequestStatus.PENDING,
      },
      data: {
        status: VerifierRequestStatus.APPROVED,
        decisionNote: decisionNote?.trim() || null,
        decidedByUserId,
        decidedAt: new Date(),
      },
    });

    if (updateResult.count < 1) {
      return { outcome: "REQUEST_NOT_PENDING" } satisfies AdminVerifierRequestDecisionResult;
    }

    const activeMembership = await tx.verifierPoolMembership.findFirst({
      where: {
        userId: request.userId,
        status: VerifierPoolStatus.ACTIVE,
        revokedAt: null,
      },
      select: { id: true },
    });

    let membershipCreated = false;

    if (!activeMembership) {
      await tx.verifierPoolMembership.create({
        data: {
          userId: request.userId,
          status: VerifierPoolStatus.ACTIVE,
          grantedByUserId: decidedByUserId,
          grantReason: "verifier_request_approved",
        },
      });
      membershipCreated = true;
    }

    await tx.auditLog.create({
      data: {
        actorUserId: decidedByUserId,
        actorType: AuditActorType.USER,
        objectType: AuditObjectType.VERIFIER_ELIGIBILITY_REQUEST,
        objectId: request.id,
        actionType: AuditActionType.APPROVE,
        reason: "admin_verifier_request_approved",
        metadata: {
          requestId: request.id,
          targetUserId: request.userId,
          decidedByUserId,
          decisionNote: decisionNote?.trim() || null,
          membershipCreated,
        },
      },
    });

    if (membershipCreated) {
      await tx.auditLog.create({
        data: {
          actorUserId: decidedByUserId,
          actorType: AuditActorType.USER,
          objectType: AuditObjectType.VERIFIER_POOL_MEMBERSHIP,
          objectId: request.userId,
          actionType: AuditActionType.CREATE,
          reason: "verifier_pool_membership_granted_via_request_approval",
          metadata: {
            targetUserId: request.userId,
            grantedByUserId: decidedByUserId,
            sourceRequestId: request.id,
          },
        },
      });
    }

    return {
      outcome: "APPROVED",
      membershipCreated,
    } satisfies AdminVerifierRequestDecisionResult;
  });
}

export async function rejectVerifierEligibilityRequestInDb(params: {
  requestId: string;
  decidedByUserId: string;
  decisionNote: string;
}): Promise<AdminVerifierRequestDecisionResult> {
  const { requestId, decidedByUserId, decisionNote } = params;

  const request = await prisma.verifierEligibilityRequest.findUnique({
    where: { id: requestId },
    select: { id: true, userId: true, status: true },
  });

  if (!request) {
    return { outcome: "REQUEST_NOT_FOUND" };
  }

  if (request.status !== VerifierRequestStatus.PENDING) {
    return { outcome: "REQUEST_NOT_PENDING" };
  }

  return prisma.$transaction(async (tx) => {
    const updateResult = await tx.verifierEligibilityRequest.updateMany({
      where: {
        id: requestId,
        status: VerifierRequestStatus.PENDING,
      },
      data: {
        status: VerifierRequestStatus.REJECTED,
        decisionNote,
        decidedByUserId,
        decidedAt: new Date(),
      },
    });

    if (updateResult.count < 1) {
      return { outcome: "REQUEST_NOT_PENDING" } satisfies AdminVerifierRequestDecisionResult;
    }

    const activeMembership = await tx.verifierPoolMembership.findFirst({
      where: {
        userId: request.userId,
        status: VerifierPoolStatus.ACTIVE,
        revokedAt: null,
      },
      select: { id: true },
    });

    let membershipRevoked = false;

    if (activeMembership) {
      await tx.verifierPoolMembership.update({
        where: { id: activeMembership.id },
        data: {
          status: VerifierPoolStatus.REVOKED,
          revokedByUserId: decidedByUserId,
          revokeReason: "verifier_request_rejected",
          revokedAt: new Date(),
        },
      });

      membershipRevoked = true;
    }

    await tx.auditLog.create({
      data: {
        actorUserId: decidedByUserId,
        actorType: AuditActorType.USER,
        objectType: AuditObjectType.VERIFIER_ELIGIBILITY_REQUEST,
        objectId: request.id,
        actionType: AuditActionType.REJECT,
        reason: "admin_verifier_request_rejected",
        metadata: {
          requestId: request.id,
          targetUserId: request.userId,
          decidedByUserId,
          decisionNote,
          membershipRevoked,
        },
      },
    });

    if (membershipRevoked) {
      await tx.auditLog.create({
        data: {
          actorUserId: decidedByUserId,
          actorType: AuditActorType.USER,
          objectType: AuditObjectType.VERIFIER_POOL_MEMBERSHIP,
          objectId: request.userId,
          actionType: AuditActionType.REVOKE,
          reason: "verifier_pool_membership_revoked_via_request_rejection",
          metadata: {
            targetUserId: request.userId,
            revokedByUserId: decidedByUserId,
            sourceRequestId: request.id,
          },
        },
      });
    }

    return {
      outcome: "REJECTED",
      membershipRevoked,
    } satisfies AdminVerifierRequestDecisionResult;
  });
}
