import { redirect } from "next/navigation";

import { ChallengeDraftForm } from "@/components/challenges/challenge-draft-form";
import { getSession } from "@/lib/auth/session";

import { createChallengeDraftAction } from "./actions";

type NewChallengePageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function NewChallengePage({ searchParams }: NewChallengePageProps) {
  const [session, params] = await Promise.all([getSession(), searchParams]);

  if (!session?.user) {
    redirect("/sign-in?returnTo=/challenges/new");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col p-6">
      <h1 className="text-3xl font-semibold">Create challenge draft</h1>
      <p className="mt-2 text-sm text-slate-300">Save your challenge as a draft, then publish from the edit page.</p>

      {params.error ? (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Please review your inputs and try again.
        </p>
      ) : null}

      <ChallengeDraftForm
        action={createChallengeDraftAction}
        submitLabel="Create draft"
        values={{
          title: "",
          shortDescription: "",
          longDescription: "",
        }}
      />
    </main>
  );
}
