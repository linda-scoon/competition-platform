import Link from "next/link";
import { redirect } from "next/navigation";

import { ChallengeDraftForm } from "@/components/challenges/challenge-draft-form";
import { getSession } from "@/lib/auth/session";
import { ChallengeStatus } from "@prisma/client";

import {
  ensureChallengeCreator,
  getOwnedChallengeForEditingBySlugFromDb,
} from "@/lib/challenges/draft-repository";
import { listOwnerCoverMediaAssetsForChallengeFromDb } from "@/lib/media/repository";

import { editChallengeDraftAction, publishChallengeAction } from "./actions";

type EditChallengePageProps = {
  params: Promise<{
    challengeSlug: string;
  }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    error?: string;
    publish?: string;
    moderationNote?: string;
  }>;
};

export default async function EditChallengePage({ params, searchParams }: EditChallengePageProps) {
  const [routeParams, queryParams, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const returnTo = `/challenges/${routeParams.challengeSlug}/edit`;

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const user = session.user;

  await ensureChallengeCreator(user);

  const [challenge, coverAssets] = await Promise.all([
    getOwnedChallengeForEditingBySlugFromDb({
      slug: routeParams.challengeSlug,
      creatorUserId: user.id,
    }),
    listOwnerCoverMediaAssetsForChallengeFromDb({ ownerUserId: user.id }),
  ]);

  if (!challenge) {
    redirect("/dashboard");
  }

  const saveDraftAction = editChallengeDraftAction.bind(null, {
    challengeSlug: routeParams.challengeSlug,
  });
  const publishAction = publishChallengeAction.bind(null, {
    challengeSlug: routeParams.challengeSlug,
  });
  const isDraft = challenge.status === ChallengeStatus.DRAFT;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col p-6">
      <h1 className="text-3xl font-semibold">
        {isDraft ? "Edit challenge draft" : "Edit published challenge"}
      </h1>
      <p className="mt-2 text-sm text-slate-300">
        {isDraft
          ? "Save draft updates or publish now with immediate AI moderation."
          : "Submit public edits for immediate AI moderation before they go live."}
      </p>

      {queryParams.created ? (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Draft created. Continue editing anytime before publish.
        </p>
      ) : null}

      {queryParams.saved ? (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Draft changes saved.
        </p>
      ) : null}

      {queryParams.publish === "approved" ? (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Publish approved. Public challenge content is now live.
        </p>
      ) : null}

      {queryParams.publish === "rejected" ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Publish rejected by moderation. {queryParams.moderationNote}
        </p>
      ) : null}

      {queryParams.error ? (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          {queryParams.error === "invalid_cover_image"
            ? "Selected cover image is not eligible. Choose one of your approved or pending cover images."
            : "Please review your inputs and try again."}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          className="inline-flex rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
          href={`/challenges/${routeParams.challengeSlug}/verifiers`}
        >
          Manage verifiers
        </Link>
        <Link
          className="inline-flex rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
          href="/dashboard/media"
        >
          Open media library
        </Link>
      </div>

      <ChallengeDraftForm
        action={saveDraftAction}
        submitLabel={isDraft ? "Save draft" : "Save draft (disabled for published challenges)"}
        secondarySubmitAction={publishAction}
        secondarySubmitLabel={isDraft ? "Publish challenge" : "Submit public edit for moderation"}
        showPrimarySubmit={isDraft}
        values={{
          title: challenge.title,
          shortDescription: challenge.shortDescription,
          longDescription: challenge.longDescription,
          coverImageId: challenge.coverImageId,
        }}
        coverImageOptions={coverAssets.map((asset) => ({
          id: asset.id,
          status: asset.status,
        }))}
      />
    </main>
  );
}
