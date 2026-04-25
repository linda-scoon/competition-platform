import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  MediaAssetStatus: {
    PENDING_MODERATION: "PENDING_MODERATION",
    APPROVED: "APPROVED",
    REJECTED: "REJECTED",
    REMOVED: "REMOVED",
  },
  MediaAssetType: {
    CHALLENGE_COVER: "CHALLENGE_COVER",
    PROFILE_AVATAR: "PROFILE_AVATAR",
  },
  MediaModerationDecisionType: {
    APPROVE: "APPROVE",
    REJECT: "REJECT",
    REMOVE: "REMOVE",
    OVERRIDE_APPROVE: "OVERRIDE_APPROVE",
    OVERRIDE_REJECT: "OVERRIDE_REJECT",
  },
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    mediaAsset: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: prismaMock,
}));

import {
  moderateMediaAssetInDb,
  resolveOwnedCoverImageSelectionInDb,
  uploadMediaImageInDb,
} from "@/lib/media/repository";

describe("media repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("accepts only images for upload", async () => {
    const nonImage = new File(["hello"], "file.txt", { type: "text/plain" });

    const result = await uploadMediaImageInDb({
      ownerUserId: "user_1",
      file: nonImage,
      type: "CHALLENGE_COVER" as never,
    });

    expect(result).toEqual({ outcome: "INVALID_TYPE" });
    expect(prismaMock.mediaAsset.create).not.toHaveBeenCalled();
  });

  it("requires note for remove decision", async () => {
    const result = await moderateMediaAssetInDb({
      mediaAssetId: "asset_1",
      deciderUserId: "admin_1",
      decisionType: "REMOVE" as never,
      note: "",
    });

    expect(result).toEqual({ outcome: "NOTE_REQUIRED" });
  });

  it("rejects selecting cover image not owned by user", async () => {
    prismaMock.mediaAsset.findFirst.mockResolvedValue(null);

    const result = await resolveOwnedCoverImageSelectionInDb({
      ownerUserId: "user_1",
      coverImageIdRaw: "asset_2",
    });

    expect(result).toEqual("INVALID");
  });
});
