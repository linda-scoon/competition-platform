import { ChallengeStatus, ChallengeVersionStatus, ChallengeVisibilityState } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import type { ChallengeDraftInput } from "./schema";
import { MODERATION_UNAVAILABLE_REASON, moderateChallengeContent } from "./content-moderation";

function toSlugBase(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 48);
}

async function createUniqueDraftSlug(title: string) {
  const base = toSlugBase(title) || "challenge";

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const suffix = Math.random().toString(36).slice(2, 8);
    const candidate = `${base}-${suffix}`;
    const existing = await prisma.challenge.findUnique({ where: { slug: candidate }, select: { id: true } });

    if (!existing) {
      return candidate;
    }
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

export async function ensureChallengeCreator(user: { id: string; email: string; name: string }) {
  await prisma.user.upsert({
    where: { id: user.id },
    update: {
      email: user.email.toLowerCase(),
      displayName: user.name,
    },
    create: {
      id: user.id,
      email: user.email.toLowerCase(),
      displayName: user.name,
      username: `u_${user.id}`,
    },
  });
}

export async function createChallengeDraftInDb(input: { creatorUserId: string } & ChallengeDraftInput) {
  const submissionOpensAt = new Date("2100-01-01T00:00:00.000Z");
  const submissionClosesAt = new Date("2100-01-08T00:00:00.000Z");
  const slug = await createUniqueDraftSlug(input.title);

  return prisma.challenge.create({
    data: {
      slug,
      creatorUserId: input.creatorUserId,
      title: input.title,
      shortDescription: input.shortDescription,
      longDescription: input.longDescription,
      status: ChallengeStatus.DRAFT,
      visibilityState: ChallengeVisibilityState.PRIVATE_DRAFT,
      isPublic: false,
      submissionOpensAt,
      submissionClosesAt,
    },
    select: {
      id: true,
      slug: true,
    },
  });
}

export async function getOwnedDraftBySlugFromDb(input: { slug: string; creatorUserId: string }) {
  return prisma.challenge.findFirst({
    where: {
      slug: input.slug,
      creatorUserId: input.creatorUserId,
      status: ChallengeStatus.DRAFT,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      longDescription: true,
      status: true,
    },
  });
}

export async function getOwnedChallengeForEditingBySlugFromDb(input: { slug: string; creatorUserId: string }) {
  return prisma.challenge.findFirst({
    where: {
      slug: input.slug,
      creatorUserId: input.creatorUserId,
      status: {
        in: [ChallengeStatus.DRAFT, ChallengeStatus.PUBLISHED_UNLOCKED],
      },
    },
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      longDescription: true,
      status: true,
      isPublic: true,
    },
  });
}

export async function updateOwnedDraftBySlugInDb(input: {
  slug: string;
  creatorUserId: string;
  values: ChallengeDraftInput;
}) {
  const existing = await getOwnedDraftBySlugFromDb({ slug: input.slug, creatorUserId: input.creatorUserId });

  if (!existing) {
    return null;
  }

  return prisma.challenge.update({
    where: { id: existing.id },
    data: {
      title: input.values.title,
      shortDescription: input.values.shortDescription,
      longDescription: input.values.longDescription,
    },
    select: {
      id: true,
      slug: true,
      title: true,
      shortDescription: true,
      longDescription: true,
      status: true,
    },
  });
}

type PublishModerationResult =
  | { outcome: "approved"; moderationNotes: string[] }
  | { outcome: "rejected"; moderationNotes: string[] };

export async function submitChallengePublishForModerationInDb(input: {
  slug: string;
  creatorUserId: string;
  values: ChallengeDraftInput;
}): Promise<PublishModerationResult | null> {
  const editableChallenge = await getOwnedChallengeForEditingBySlugFromDb({
    slug: input.slug,
    creatorUserId: input.creatorUserId,
  });

  if (!editableChallenge) {
    return null;
  }

  const versionRecord = await prisma.$transaction(async (tx) => {
    const latestVersion = await tx.challengeVersion.findFirst({
      where: {
        challengeId: editableChallenge.id,
      },
      orderBy: {
        versionNumber: "desc",
      },
      select: {
        versionNumber: true,
      },
    });

    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    return tx.challengeVersion.create({
      data: {
        challengeId: editableChallenge.id,
        versionNumber: nextVersionNumber,
        title: input.values.title,
        shortDescription: input.values.shortDescription,
        longDescription: input.values.longDescription,
        rulesSnapshot: {},
        scoringSnapshot: {},
        evidencePolicySnapshot: {},
        status: ChallengeVersionStatus.PENDING_MODERATION,
        createdByUserId: input.creatorUserId,
      },
      select: {
        id: true,
      },
    });
  });

  const moderationDecision = await moderateChallengeContent(input.values);

  if (moderationDecision.decision === "rejected") {
    const isModerationUnavailable = moderationDecision.reasons.includes(MODERATION_UNAVAILABLE_REASON);
    const moderationNotePrefix = isModerationUnavailable ? "[MODERATION_UNAVAILABLE]" : "[MODERATION_REJECTED]";
    const moderationNote = `${moderationNotePrefix} ${moderationDecision.reasons.join(" ")}`;

    await prisma.challengeVersion.update({
      where: {
        id: versionRecord.id,
      },
      data: {
        status: ChallengeVersionStatus.REJECTED,
        moderationNotes: moderationNote,
      },
    });

    return {
      outcome: "rejected",
      moderationNotes: moderationDecision.reasons,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.challengeVersion.update({
      where: {
        id: versionRecord.id,
      },
      data: {
        status: ChallengeVersionStatus.APPROVED,
        moderationNotes: moderationDecision.reasons.join(" "),
        approvedAt: new Date(),
      },
    });

    await tx.challenge.update({
      where: {
        id: editableChallenge.id,
      },
      data: {
        title: input.values.title,
        shortDescription: input.values.shortDescription,
        longDescription: input.values.longDescription,
        status:
          editableChallenge.status === ChallengeStatus.DRAFT
            ? ChallengeStatus.PUBLISHED_UNLOCKED
            : editableChallenge.status,
        visibilityState: ChallengeVisibilityState.PUBLIC,
        isPublic: true,
        lastApprovedVersionId: versionRecord.id,
      },
    });
  });

  return {
    outcome: "approved",
    moderationNotes: moderationDecision.reasons,
  };
}
