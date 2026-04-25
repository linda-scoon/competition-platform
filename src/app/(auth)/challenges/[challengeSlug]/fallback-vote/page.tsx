import { ParticipantVerificationVoteStatus } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getFallbackVoteViewStateFromDb } from "@/lib/challenges/fallback-vote-repository";

import { voteFallbackNoAction, voteFallbackYesAction } from "./actions";

type FallbackVotePageProps = {
  params: Promise<{
    challengeSlug: string;
  }>;
  searchParams: Promise<{
    voted?: string;
    error?: string;
  }>;
};

function statusText(status: ParticipantVerificationVoteStatus): string {
  if (status === ParticipantVerificationVoteStatus.OPEN) {
    return "Open";
  }

  if (status === ParticipantVerificationVoteStatus.PASSED) {
    return "Passed";
  }

  if (status === ParticipantVerificationVoteStatus.FAILED) {
    return "Failed";
  }

  return "Canceled";
}

export default async function ChallengeFallbackVotePage({
  params,
  searchParams,
}: FallbackVotePageProps) {
  const [routeParams, queryParams, session] = await Promise.all([params, searchParams, getSession()]);
  const returnTo = `/challenges/${routeParams.challengeSlug}/fallback-vote`;

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const view = await getFallbackVoteViewStateFromDb({
    challengeSlug: routeParams.challengeSlug,
    actorUserId: session.user.id,
  });

  if (view.outcome === "NOT_FOUND") {
    redirect("/dashboard");
  }

  if (view.outcome === "FORBIDDEN") {
    redirect("/dashboard");
  }

  const voteYesAction = voteFallbackYesAction.bind(null, { challengeSlug: routeParams.challengeSlug });
  const voteNoAction = voteFallbackNoAction.bind(null, { challengeSlug: routeParams.challengeSlug });

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Fallback verification vote</h1>
        <p className="mt-2 text-sm text-slate-300">
          Challenge: <span className="font-medium">{view.challenge.title}</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Participants can enable fallback verification only when no active verifiers remain.
        </p>
      </header>

      {queryParams.voted === "1" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Vote recorded.
        </p>
      ) : null}

      {queryParams.error === "vote_not_open" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Fallback vote is not currently open.
        </p>
      ) : null}

      {queryParams.error === "forbidden" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Only active participants can vote.
        </p>
      ) : null}

      {view.vote ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-200">
          <p>
            <span className="font-medium">Status:</span> {statusText(view.vote.status)}
          </p>
          <p className="mt-1">
            <span className="font-medium">Opened:</span> {view.vote.openedAt.toLocaleString()}
          </p>
          <p className="mt-1">
            <span className="font-medium">Closed:</span>{" "}
            {view.vote.closedAt ? view.vote.closedAt.toLocaleString() : "Not closed"}
          </p>
          <p className="mt-3">
            <span className="font-medium">Participants:</span> {view.vote.participantCount}
          </p>
          <p>
            <span className="font-medium">Ballots cast:</span> {view.vote.ballotsCount}
          </p>
          <p>
            <span className="font-medium">Yes:</span> {view.vote.yesCount}
          </p>
          <p>
            <span className="font-medium">No:</span> {view.vote.noCount}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            Rule: vote passes only if yes votes are greater than 50% of all current participants and
            at least 3 participants are active.
          </p>

          {view.vote.status === ParticipantVerificationVoteStatus.OPEN ? (
            <div className="mt-4 flex flex-wrap gap-2">
              <form action={voteYesAction}>
                <button
                  className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                  type="submit"
                >
                  Vote yes
                </button>
              </form>
              <form action={voteNoAction}>
                <button
                  className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 hover:bg-slate-800"
                  type="submit"
                >
                  Vote no
                </button>
              </form>
            </div>
          ) : null}

          <p className="mt-3 text-xs text-slate-400">
            Your ballot: {view.vote.actorBallot ?? "Not voted"}
          </p>
        </div>
      ) : (
        <p className="rounded-md border border-slate-700 bg-slate-900/60 p-3 text-sm text-slate-300">
          No fallback vote has been opened for this challenge.
        </p>
      )}

      <div>
        <Link className="text-sm text-slate-300 underline hover:text-slate-100" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
