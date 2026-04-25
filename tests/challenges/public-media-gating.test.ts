import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  ChallengeStatus: {
    PUBLISHED_UNLOCKED: "PUBLISHED_UNLOCKED",
  },
  ChallengeVisibilityState: {
    PUBLIC: "PUBLIC",
  },
  RunSubmissionStatus: {
    VERIFIED: "VERIFIED",
  },
  MediaAssetStatus: {
    APPROVED: "APPROVED",
    PENDING_MODERATION: "PENDING_MODERATION",
  },
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    challenge: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/challenges/state-transition-repository", () => ({
  reconcileDueChallengeLifecycleTransitionsInDb: vi.fn().mockResolvedValue(undefined),
  reconcileChallengeLifecycleBySlugInDb: vi.fn().mockResolvedValue(undefined),
}));

import {
  getPublicChallengeDetailBySlugFromDb,
  getPublicChallengeDirectoryFromDb,
} from "@/lib/challenges/public-repository";

describe("public media gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns cover image url only when approved", async () => {
    prismaMock.challenge.findMany.mockResolvedValue([
      {
        id: "challenge_1",
        slug: "challenge-1",
        status: "PUBLISHED_UNLOCKED",
        submissionOpensAt: new Date("2026-01-01T00:00:00.000Z"),
        submissionClosesAt: new Date("2026-01-02T00:00:00.000Z"),
        creator: { displayName: "Creator" },
        lastApprovedVersion: { title: "Challenge", shortDescription: "Description" },
        coverImage: {
          storageKey: "data:image/png;base64,abc",
          status: "PENDING_MODERATION",
        },
      },
    ]);

    const directory = await getPublicChallengeDirectoryFromDb();

    expect(directory[0]?.coverImageUrl).toBeNull();
  });

  it("exposes approved cover image url on detail page", async () => {
    prismaMock.challenge.findFirst.mockResolvedValue({
      id: "challenge_1",
      slug: "challenge-1",
      status: "PUBLISHED_UNLOCKED",
      submissionOpensAt: new Date("2026-01-01T00:00:00.000Z"),
      submissionClosesAt: new Date("2026-01-02T00:00:00.000Z"),
      creator: { displayName: "Creator", username: "creator" },
      lastApprovedVersion: {
        title: "Challenge",
        shortDescription: "Description",
        longDescription: "Long description",
        rulesSnapshot: {},
        scoringSnapshot: {},
        evidencePolicySnapshot: {},
      },
      coverImage: {
        storageKey: "data:image/png;base64,abc",
        status: "APPROVED",
      },
      runSubmissions: [],
    });

    const detail = await getPublicChallengeDetailBySlugFromDb("challenge-1");

    expect(detail?.coverImageUrl).toEqual("data:image/png;base64,abc");
  });
});
