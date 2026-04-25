import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getReviewQueueViewStateFromDb } from "@/lib/runs/review-queue-repository";

import { claimReviewSubmissionAction, releaseReviewClaimAction } from "./actions";

type ReviewQueuePageProps = {
  params: Promise<{
    challengeSlug: string;
  }>;
  searchParams: Promise<{
    claimed?: string;
    released?: string;
    error?: string;
  }>;
};

function getPrimaryScoreLabel(scorePayload: unknown): string {
  if (!scorePayload || typeof scorePayload !== "object") {
    return "—";
  }

  const primaryScore = (scorePayload as { primaryScore?: unknown }).primaryScore;

  if (typeof primaryScore !== "number" || Number.isNaN(primaryScore)) {
    return "—";
  }

  return String(primaryScore);
}

export default async function ChallengeReviewQueuePage({
  params,
  searchParams,
}: ReviewQueuePageProps) {
  const [routeParams, queryParams, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);

  const returnTo = `/challenges/${routeParams.challengeSlug}/review-queue`;

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const queue = await getReviewQueueViewStateFromDb({
    challengeSlug: routeParams.challengeSlug,
    actorUserId: session.user.id,
  });

  if (queue.outcome === "NOT_FOUND") {
    redirect("/dashboard");
  }

  if (queue.outcome === "FORBIDDEN") {
    redirect("/dashboard");
  }

  const claimAction = claimReviewSubmissionAction.bind(null, {
    challengeSlug: routeParams.challengeSlug,
  });
  const releaseAction = releaseReviewClaimAction.bind(null, {
    challengeSlug: routeParams.challengeSlug,
  });

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Review queue</h1>
        <p className="mt-2 text-sm text-slate-300">
          Challenge: <span className="font-medium">{queue.viewState.challenge.title}</span>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          {queue.viewState.access.isAdminAuthority
            ? "Admin authority access"
            : "Assigned verifier access"}
        </p>
      </header>

      {queryParams.claimed === "1" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Submission claimed.
        </p>
      ) : null}

      {queryParams.released === "1" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Claim released.
        </p>
      ) : null}

      {queryParams.error === "forbidden" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          You do not have permission for this queue action.
        </p>
      ) : null}

      {queryParams.error === "already_claimed_by_you" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          You already claimed that submission.
        </p>
      ) : null}

      {queryParams.error === "already_claimed_by_other" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Another verifier already claimed that submission.
        </p>
      ) : null}

      {queryParams.error === "not_claimed" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          That submission is not currently claimed.
        </p>
      ) : null}

      {queryParams.error === "submission_not_found" ||
      queryParams.error === "invalid_submission" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Invalid submission selection.
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Unclaimed submissions</h2>

        {queue.viewState.unclaimedSubmissions.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">No unclaimed submissions in queue.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {queue.viewState.unclaimedSubmissions.map((submission) => (
              <li
                key={submission.id}
                className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="space-y-1 text-sm text-slate-200">
                  <p>
                    <span className="font-medium">Submission:</span> {submission.id}
                  </p>
                  <p>
                    <span className="font-medium">Participant:</span> {submission.user.displayName}{" "}
                    (@
                    {submission.user.username})
                  </p>
                  <p>
                    <span className="font-medium">Submitted:</span>{" "}
                    {submission.submittedAt.toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Primary score:</span>{" "}
                    {getPrimaryScoreLabel(submission.scorePayload)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
                    href={submission.videoUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    Open video
                  </Link>

                  <form action={claimAction}>
                    <input name="submissionId" type="hidden" value={submission.id} />
                    <button
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      type="submit"
                    >
                      Claim submission
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Claimed by you</h2>

        {queue.viewState.claimedByYou.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">
            You have no claimed submissions in this queue.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {queue.viewState.claimedByYou.map((submission) => (
              <li
                key={submission.id}
                className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="space-y-1 text-sm text-slate-200">
                  <p>
                    <span className="font-medium">Submission:</span> {submission.id}
                  </p>
                  <p>
                    <span className="font-medium">Participant:</span> {submission.user.displayName}{" "}
                    (@
                    {submission.user.username})
                  </p>
                  <p>
                    <span className="font-medium">Submitted:</span>{" "}
                    {submission.submittedAt.toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Primary score:</span>{" "}
                    {getPrimaryScoreLabel(submission.scorePayload)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    className="rounded-md border border-slate-700 px-3 py-2 text-sm text-slate-100 hover:bg-slate-800"
                    href={submission.videoUrl}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    Open video
                  </Link>

                  <form action={releaseAction}>
                    <input name="submissionId" type="hidden" value={submission.id} />
                    <button
                      className="rounded-md border border-amber-600 px-3 py-2 text-sm font-medium text-amber-200 hover:bg-amber-900/30"
                      type="submit"
                    >
                      Release claim
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Claimed by other verifiers</h2>

        {queue.viewState.claimedByOtherVerifiers.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">
            No submissions are currently claimed by other verifiers.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {queue.viewState.claimedByOtherVerifiers.map((submission) => (
              <li
                key={submission.id}
                className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
              >
                <div className="space-y-1 text-sm text-slate-200">
                  <p>
                    <span className="font-medium">Submission:</span> {submission.id}
                  </p>
                  <p>
                    <span className="font-medium">Participant:</span> {submission.user.displayName}{" "}
                    (@
                    {submission.user.username})
                  </p>
                  <p>
                    <span className="font-medium">Claimed by:</span>{" "}
                    {submission.claimedByVerifier.displayName} (@
                    {submission.claimedByVerifier.username})
                  </p>
                  <p>
                    <span className="font-medium">Claimed at:</span>{" "}
                    {submission.claimedAt.toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <Link className="text-sm text-slate-300 hover:text-white" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </section>
  );
}
