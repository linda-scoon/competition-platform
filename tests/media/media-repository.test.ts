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
  AuditActorType: {
    USER: "USER",
    SYSTEM: "SYSTEM",
  },
  AuditObjectType: {
    MEDIA_ASSET: "MEDIA_ASSET",
  },
  AuditActionType: {
    APPROVE: "APPROVE",
    REJECT: "REJECT",
    REMOVE: "REMOVE",
    OVERRIDE: "OVERRIDE",
  },
}));

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    mediaAsset: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    mediaModerationDecision: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
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

  it("rejects moderation when media is no longer pending", async () => {
    prismaMock.mediaAsset.findUnique.mockResolvedValue({
      id: "asset_1",
      status: "APPROVED",
    });

    const result = await moderateMediaAssetInDb({
      mediaAssetId: "asset_1",
      deciderUserId: "admin_1",
      decisionType: "REMOVE" as never,
      note: "policy issue",
    });

    expect(result).toEqual({ outcome: "NOT_PENDING" });
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("writes moderation decision and audit record for pending media", async () => {
    prismaMock.mediaAsset.findUnique.mockResolvedValue({
      id: "asset_1",
      status: "PENDING_MODERATION",
    });
    prismaMock.$transaction.mockImplementation(async (callback) => callback(prismaMock));
    prismaMock.mediaAsset.update.mockResolvedValue({ id: "asset_1" });
    prismaMock.mediaModerationDecision.create.mockResolvedValue({ id: "decision_1" });
    prismaMock.auditLog.create.mockResolvedValue({ id: "audit_1" });

    const result = await moderateMediaAssetInDb({
      mediaAssetId: "asset_1",
      deciderUserId: "admin_1",
      decisionType: "APPROVE" as never,
      note: "  looks good  ",
    });

    expect(result).toEqual({ outcome: "DECIDED", nextStatus: "APPROVED" });
    expect(prismaMock.mediaModerationDecision.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          note: "looks good",
        }),
      }),
    );
    expect(prismaMock.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          objectId: "asset_1",
          reason: "media_moderation_decision_recorded",
        }),
      }),
    );
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
