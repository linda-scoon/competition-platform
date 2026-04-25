import { MediaAssetStatus, MediaAssetType, MediaModerationDecisionType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type UploadMediaImageResult =
  | { outcome: "INVALID_TYPE" }
  | { outcome: "TOO_LARGE" }
  | { outcome: "CREATED"; mediaAssetId: string };

export async function uploadMediaImageInDb(input: {
  ownerUserId: string;
  file: File;
  type: MediaAssetType;
}): Promise<UploadMediaImageResult> {
  if (!input.file.type.startsWith("image/")) {
    return { outcome: "INVALID_TYPE" };
  }

  if (input.file.size > MAX_UPLOAD_BYTES) {
    return { outcome: "TOO_LARGE" };
  }

  const bytes = Buffer.from(await input.file.arrayBuffer());
  const storageKey = `data:${input.file.type};base64,${bytes.toString("base64")}`;

  const mediaAsset = await prisma.mediaAsset.create({
    data: {
      ownerUserId: input.ownerUserId,
      type: input.type,
      storageKey,
      mimeType: input.file.type,
      status: MediaAssetStatus.PENDING_MODERATION,
    },
    select: {
      id: true,
    },
  });

  return {
    outcome: "CREATED",
    mediaAssetId: mediaAsset.id,
  };
}

export async function listOwnedMediaAssetsFromDb(ownerUserId: string) {
  return prisma.mediaAsset.findMany({
    where: {
      ownerUserId,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      status: true,
      mimeType: true,
      createdAt: true,
      storageKey: true,
    },
  });
}

export async function listPendingMediaAssetsForAdminFromDb() {
  return prisma.mediaAsset.findMany({
    where: {
      status: MediaAssetStatus.PENDING_MODERATION,
    },
    orderBy: [{ createdAt: "asc" }],
    select: {
      id: true,
      type: true,
      mimeType: true,
      storageKey: true,
      createdAt: true,
      ownerUser: {
        select: {
          id: true,
          displayName: true,
          username: true,
          email: true,
        },
      },
    },
  });
}

export type ModerateMediaAssetResult =
  | { outcome: "MEDIA_NOT_FOUND" }
  | { outcome: "NOTE_REQUIRED" }
  | { outcome: "DECIDED"; nextStatus: MediaAssetStatus };

export async function moderateMediaAssetInDb(input: {
  mediaAssetId: string;
  deciderUserId: string;
  decisionType: MediaModerationDecisionType;
  note: string;
}): Promise<ModerateMediaAssetResult> {
  const nextStatus =
    input.decisionType === MediaModerationDecisionType.APPROVE ||
    input.decisionType === MediaModerationDecisionType.OVERRIDE_APPROVE
      ? MediaAssetStatus.APPROVED
      : input.decisionType === MediaModerationDecisionType.REJECT ||
          input.decisionType === MediaModerationDecisionType.OVERRIDE_REJECT
        ? MediaAssetStatus.REJECTED
        : MediaAssetStatus.REMOVED;

  if (
    (nextStatus === MediaAssetStatus.REJECTED || nextStatus === MediaAssetStatus.REMOVED) &&
    !input.note
  ) {
    return { outcome: "NOTE_REQUIRED" };
  }

  const mediaAsset = await prisma.mediaAsset.findUnique({
    where: {
      id: input.mediaAssetId,
    },
    select: {
      id: true,
    },
  });

  if (!mediaAsset) {
    return { outcome: "MEDIA_NOT_FOUND" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.mediaAsset.update({
      where: {
        id: input.mediaAssetId,
      },
      data: {
        status: nextStatus,
      },
    });

    await tx.mediaModerationDecision.create({
      data: {
        mediaAssetId: input.mediaAssetId,
        deciderUserId: input.deciderUserId,
        decisionType: input.decisionType,
        note: input.note || null,
      },
    });
  });

  return {
    outcome: "DECIDED",
    nextStatus,
  };
}

export async function listOwnerCoverMediaAssetsForChallengeFromDb(input: { ownerUserId: string }) {
  return prisma.mediaAsset.findMany({
    where: {
      ownerUserId: input.ownerUserId,
      type: MediaAssetType.CHALLENGE_COVER,
      status: {
        in: [MediaAssetStatus.APPROVED, MediaAssetStatus.PENDING_MODERATION],
      },
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function resolveOwnedCoverImageSelectionInDb(input: {
  ownerUserId: string;
  coverImageIdRaw: string;
}): Promise<string | null | "INVALID"> {
  const normalized = input.coverImageIdRaw.trim();

  if (!normalized) {
    return null;
  }

  const mediaAsset = await prisma.mediaAsset.findFirst({
    where: {
      id: normalized,
      ownerUserId: input.ownerUserId,
      type: MediaAssetType.CHALLENGE_COVER,
      status: {
        in: [MediaAssetStatus.APPROVED, MediaAssetStatus.PENDING_MODERATION],
      },
    },
    select: {
      id: true,
    },
  });

  if (!mediaAsset) {
    return "INVALID";
  }

  return mediaAsset.id;
}
