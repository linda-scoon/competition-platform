import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { ensureChallengeCreator } from "@/lib/challenges/draft-repository";
import { getChallengeVerifierAssignmentViewStateFromDb } from "@/lib/challenges/verifier-assignment-repository";

import { assignVerifierAction, removeVerifierAction } from "./actions";

type ManageChallengeVerifiersPageProps = {
  params: Promise<{
    challengeSlug: string;
  }>;
  searchParams: Promise<{
    assigned?: string;
    removed?: string;
    error?: string;
  }>;
};

function getBlockReasonLabel(blockReason: string | null) {
  if (blockReason === "SELF_ASSIGNMENT_BLOCKED") {
    return "Blocked: creator self-assignment is not allowed.";
  }

  if (blockReason === "ALREADY_ASSIGNED") {
    return "Already assigned.";
  }

  if (blockReason === "CONFLICT_ACTIVE_PARTICIPANT") {
    return "Blocked by conflict: user is an active challenge participant.";
  }

  if (blockReason === "CONFLICT_RUN_SUBMISSION") {
    return "Blocked by conflict: user has submitted a run for this challenge.";
  }

  return null;
}

export default async function ManageChallengeVerifiersPage({
  params,
  searchParams,
}: ManageChallengeVerifiersPageProps) {
  const [routeParams, queryParams, session] = await Promise.all([
    params,
    searchParams,
    getSession(),
  ]);
  const returnTo = `/challenges/${routeParams.challengeSlug}/verifiers`;

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  await ensureChallengeCreator(session.user);

  const viewState = await getChallengeVerifierAssignmentViewStateFromDb({
    challengeSlug: routeParams.challengeSlug,
    creatorUserId: session.user.id,
  });

  if (!viewState) {
    redirect("/dashboard");
  }

  const assignAction = assignVerifierAction.bind(null, {
    challengeSlug: routeParams.challengeSlug,
  });
  const removeAction = removeVerifierAction.bind(null, {
    challengeSlug: routeParams.challengeSlug,
  });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Manage challenge verifiers</h1>
        <p className="mt-2 text-sm text-slate-300">
          Assign eligible verifiers from the active verifier pool. Assignment is blocked for
          conflicts and creator self-assignment.
        </p>
        <p className="mt-3 text-sm text-slate-200">
          Challenge: <span className="font-medium">{viewState.challenge.title}</span>
        </p>
      </header>

      {queryParams.assigned === "1" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Verifier assigned.
        </p>
      ) : null}

      {queryParams.removed === "1" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Verifier assignment removed.
        </p>
      ) : null}

      {queryParams.error === "invalid_verifier" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Invalid verifier selection.
        </p>
      ) : null}

      {queryParams.error === "not_in_pool" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Selected user is not in the active verifier pool.
        </p>
      ) : null}

      {queryParams.error === "self_assignment_blocked" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Creator self-assignment is blocked.
        </p>
      ) : null}

      {queryParams.error === "conflict_blocked" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Assignment blocked by challenge conflict.
        </p>
      ) : null}

      {queryParams.error === "already_assigned" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          User is already actively assigned as a verifier for this challenge.
        </p>
      ) : null}

      {queryParams.error === "invalid_assignment" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Invalid assignment selection.
        </p>
      ) : null}

      {queryParams.error === "assignment_not_found" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Assignment was not found.
        </p>
      ) : null}

      {queryParams.error === "assignment_not_active" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Assignment is no longer active.
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Active verifier assignments</h2>
        {viewState.activeAssignments.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">No active verifier assignments.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {viewState.activeAssignments.map((assignment) => (
              <li
                key={assignment.id}
                className="rounded-md border border-slate-800 bg-slate-950/70 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-slate-200">
                    <p>
                      <span className="font-medium">{assignment.user.displayName}</span> (@
                      {assignment.user.username})
                    </p>
                    <p className="text-xs text-slate-400">
                      Assigned: {assignment.assignedAt.toLocaleString()}
                    </p>
                  </div>
                  <form action={removeAction}>
                    <input name="assignmentId" type="hidden" value={assignment.id} />
                    <button
                      className="rounded-md border border-rose-700/80 px-3 py-2 text-sm text-rose-200 hover:bg-rose-900/40"
                      type="submit"
                    >
                      Remove assignment
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Active verifier pool</h2>
        {viewState.candidates.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">
            No active verifier pool members are available.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {viewState.candidates.map((candidate) => {
              const reasonLabel = getBlockReasonLabel(candidate.blockReason);

              return (
                <li
                  key={candidate.userId}
                  className="rounded-md border border-slate-800 bg-slate-950/70 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-slate-200">
                      <p>
                        <span className="font-medium">{candidate.displayName}</span> (@
                        {candidate.username})
                      </p>
                      {reasonLabel ? <p className="text-xs text-amber-300">{reasonLabel}</p> : null}
                    </div>
                    <form action={assignAction}>
                      <input name="verifierUserId" type="hidden" value={candidate.userId} />
                      <button
                        className="rounded-md border border-indigo-700/80 px-3 py-2 text-sm text-indigo-200 hover:bg-indigo-900/40 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={!candidate.canAssign}
                        type="submit"
                      >
                        Assign verifier
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div>
        <Link
          className="text-sm text-slate-300 hover:text-white"
          href={`/challenges/${routeParams.challengeSlug}/edit`}
        >
          Back to challenge edit
        </Link>
      </div>
    </main>
  );
}
