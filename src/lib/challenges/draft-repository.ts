import { ChallengeStatus, ChallengeVisibilityState } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

import type { ChallengeDraftInput } from "./schema";

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
