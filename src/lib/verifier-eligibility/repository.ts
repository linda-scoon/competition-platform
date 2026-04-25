import { prisma } from "@/lib/db/prisma";

export type VerifierEligibilityViewState =
  | {
      state: "NO_REQUEST";
    }
  | {
      state: "ACTIVE_ELIGIBILITY";
      membershipGrantedAt: Date;
    }
  | {
      state: "REQUEST_EXISTS";
      request: {
        id: string;
        status: "PENDING" | "APPROVED" | "REJECTED";
        reasonText: string;
        decisionNote: string | null;
        createdAt: Date;
        decidedAt: Date | null;
      };
    };

export type CreateVerifierEligibilityRequestResult =
  | { outcome: "CREATED"; requestId: string }
  | { outcome: "HAS_ACTIVE_ELIGIBILITY" }
  | {
      outcome: "REQUEST_ALREADY_EXISTS";
      requestStatus: "PENDING" | "APPROVED" | "REJECTED";
    };

export async function getVerifierEligibilityViewState(userId: string): Promise<VerifierEligibilityViewState> {
  const [activeMembership, latestRequest] = await Promise.all([
    prisma.verifierPoolMembership.findFirst({
      where: {
        userId,
        status: "ACTIVE",
        revokedAt: null,
      },
      select: {
        createdAt: true,
      },
    }),
    prisma.verifierEligibilityRequest.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        reasonText: true,
        decisionNote: true,
        createdAt: true,
        decidedAt: true,
      },
    }),
  ]);

  if (activeMembership) {
    return {
      state: "ACTIVE_ELIGIBILITY",
      membershipGrantedAt: activeMembership.createdAt,
    };
  }

  if (latestRequest) {
    return {
      state: "REQUEST_EXISTS",
      request: latestRequest,
    };
  }

  return {
    state: "NO_REQUEST",
  };
}

export async function createVerifierEligibilityRequestInDb(params: {
  userId: string;
  reasonText: string;
}): Promise<CreateVerifierEligibilityRequestResult> {
  const { userId, reasonText } = params;

  const currentState = await getVerifierEligibilityViewState(userId);

  if (currentState.state === "ACTIVE_ELIGIBILITY") {
    return {
      outcome: "HAS_ACTIVE_ELIGIBILITY",
    };
  }

  if (currentState.state === "REQUEST_EXISTS") {
    return {
      outcome: "REQUEST_ALREADY_EXISTS",
      requestStatus: currentState.request.status,
    };
  }

  const createdRequest = await prisma.verifierEligibilityRequest.create({
    data: {
      userId,
      status: "PENDING",
      reasonText,
    },
    select: {
      id: true,
    },
  });

  return {
    outcome: "CREATED",
    requestId: createdRequest.id,
  };
}
