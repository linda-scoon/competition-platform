import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getPublicChallengeDetailBySlugFromDb } from "@/lib/challenges/public-repository";

import { submitRunAction } from "./actions";

type SubmitRunPageProps = {
  params: Promise<{ challengeSlug: string }>;
  searchParams: Promise<{ submitted?: string; error?: string }>;
};

function getErrorMessage(errorCode: string | undefined) {
  if (errorCode === "invalid_form") {
    return "Submission fields are invalid. Check score, notes length, and required fields.";
  }

  if (errorCode === "unsupported_host") {
    return "Only YouTube links are supported for this MVP.";
  }

  if (errorCode === "unsupported_format") {
    return "Use a valid YouTube watch, short, or youtu.be video link.";
  }

  if (errorCode === "invalid_video_url") {
    return "Video URL must be a valid https YouTube URL.";
  }

  if (errorCode === "participant_not_eligible") {
    return "Only eligible active participants can submit runs.";
  }

  if (errorCode === "window_not_open") {
    return "Submission window is not open yet.";
  }

  if (errorCode === "window_closed") {
    return "Submission window has closed.";
  }

  if (errorCode === "ineligible_challenge") {
    return "This challenge is not eligible for submissions.";
  }

  return null;
}

function getEvidenceWarningText(evidencePolicySnapshot: unknown) {
  if (
    typeof evidencePolicySnapshot === "object" &&
    evidencePolicySnapshot !== null &&
    "warningText" in evidencePolicySnapshot
  ) {
    const warningText = (evidencePolicySnapshot as { warningText?: unknown }).warningText;

    if (typeof warningText === "string" && warningText.trim()) {
      return warningText.trim();
    }
  }

  return "Evidence links must remain accessible. If evidence becomes unavailable later, verification may fail.";
}

export default async function SubmitRunPage({ params, searchParams }: SubmitRunPageProps) {
  const [routeParams, queryParams, session] = await Promise.all([params, searchParams, getSession()]);

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(`/challenges/${routeParams.challengeSlug}/submit`)}`);
  }

  const challenge = await getPublicChallengeDetailBySlugFromDb(routeParams.challengeSlug);

  if (!challenge) {
    redirect("/challenges");
  }

  const errorMessage = getErrorMessage(queryParams.error);
  const submitAction = submitRunAction.bind(null, { challengeSlug: routeParams.challengeSlug });
  const evidenceWarningText = getEvidenceWarningText(challenge.evidencePolicySnapshot);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Submit run</h1>
        <p className="mt-2 text-sm text-slate-300">
          Challenge: <span className="font-medium text-slate-100">{challenge.title}</span>
        </p>
      </header>

      {queryParams.submitted === "1" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Run submitted. A locked immutable run record was created.
        </p>
      ) : null}

      {errorMessage ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          {errorMessage}
        </p>
      ) : null}

      <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        Evidence warning: {evidenceWarningText}
      </p>

      <form action={submitAction} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <label className="block text-sm">
          <span className="mb-1 block text-slate-200">Video URL (YouTube only)</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-500 focus:ring"
            name="videoUrl"
            placeholder="https://www.youtube.com/watch?v=..."
            required
            type="url"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-200">Primary score</span>
          <input
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-500 focus:ring"
            max="1000000000"
            min="0"
            name="primaryScore"
            required
            step="0.001"
            type="number"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block text-slate-200">Notes (optional)</span>
          <textarea
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none ring-indigo-500 focus:ring"
            maxLength={500}
            name="notes"
            rows={4}
          />
        </label>

        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          type="submit"
        >
          Submit locked run
        </button>
      </form>

      <Link className="text-sm text-slate-300 hover:text-white" href={`/challenges/${challenge.slug}`}>
        Back to challenge
      </Link>
    </main>
  );
}
