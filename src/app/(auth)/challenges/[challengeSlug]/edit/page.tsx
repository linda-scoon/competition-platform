import { redirect } from "next/navigation";

import { ChallengeDraftForm } from "@/components/challenges/challenge-draft-form";
import { getSession } from "@/lib/auth/session";
import { ensureChallengeCreator, getOwnedDraftBySlugFromDb } from "@/lib/challenges/draft-repository";

import { editChallengeDraftAction } from "./actions";

type EditChallengePageProps = {
  params: Promise<{
    challengeSlug: string;
  }>;
  searchParams: Promise<{
    created?: string;
    saved?: string;
    error?: string;
  }>;
};

export default async function EditChallengePage({ params, searchParams }: EditChallengePageProps) {
  const [routeParams, queryParams, session] = await Promise.all([params, searchParams, getSession()]);
  const returnTo = `/challenges/${routeParams.challengeSlug}/edit`;

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const user = session.user;

  await ensureChallengeCreator(user);

  const draft = await getOwnedDraftBySlugFromDb({
    slug: routeParams.challengeSlug,
    creatorUserId: user.id,
  });

  if (!draft) {
    redirect("/dashboard");
  }

  const action = editChallengeDraftAction.bind(null, { challengeSlug: routeParams.challengeSlug });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col p-6">
      <h1 className="text-3xl font-semibold">Edit challenge draft</h1>
      <p className="mt-2 text-sm text-slate-300">Only draft challenges are editable in this flow.</p>

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

      {queryParams.error ? (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Please review your inputs and try again.
        </p>
      ) : null}

      <ChallengeDraftForm
        action={action}
        submitLabel="Save draft"
        values={{
          title: draft.title,
          shortDescription: draft.shortDescription,
          longDescription: draft.longDescription,
        }}
      />
    </main>
  );
}
