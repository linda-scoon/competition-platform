import Link from "next/link";

import { ChallengeStatus } from "@prisma/client";

import { AdminOperationsNav } from "@/app/(admin)/admin/_components/admin-operations-nav";
import { listAdminChallengeOperationsFromDb } from "@/lib/admin/operations-repository";

import { requireAdminAccess } from "../_lib/require-admin-access";

type AdminChallengesPageProps = {
  searchParams?: Promise<{ unresolved?: string }>;
};

export default async function AdminChallengesPage({ searchParams }: AdminChallengesPageProps) {
  await requireAdminAccess("/admin/challenges");

  const params = searchParams ? await searchParams : undefined;
  const unresolvedOnly = params?.unresolved === "closed";

  const challenges = await listAdminChallengeOperationsFromDb();

  const visibleChallenges = unresolvedOnly
    ? challenges.filter(
        (challenge) => challenge.status === ChallengeStatus.CLOSED && !challenge.resultsFinalizedAt,
      )
    : challenges;

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Challenge operations</h1>
        <p className="mt-2 text-sm text-slate-300">
          Includes unresolved closed challenge visibility and moderation/problem states.
        </p>
      </header>

      <AdminOperationsNav currentPath="/admin/challenges" />

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-200">
        <p className="font-medium text-slate-100">Unresolved filters</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            className={`rounded-md border px-3 py-2 ${
              unresolvedOnly
                ? "border-slate-700 bg-slate-950 text-slate-200"
                : "border-indigo-400 bg-indigo-500/20 text-indigo-100"
            }`}
            href="/admin/challenges"
          >
            All problem-state challenges
          </Link>
          <Link
            className={`rounded-md border px-3 py-2 ${
              unresolvedOnly
                ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                : "border-slate-700 bg-slate-950 text-slate-200"
            }`}
            href="/admin/challenges?unresolved=closed"
          >
            Unresolved closed only
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {visibleChallenges.length < 1 ? (
          <p className="text-sm text-slate-300">
            No challenges match the current operational filter.
          </p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-200">
            {visibleChallenges.map((challenge) => (
              <li
                key={challenge.id}
                className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
              >
                <p>
                  <span className="font-medium">Challenge:</span> {challenge.title} (
                  {challenge.slug})
                </p>
                <p>
                  <span className="font-medium">Status:</span> {challenge.status}
                </p>
                <p>
                  <span className="font-medium">Visibility:</span> {challenge.visibilityState}
                </p>
                <p>
                  <span className="font-medium">Creator:</span> {challenge.creator.displayName} (@
                  {challenge.creator.username})
                </p>
                <p>
                  <span className="font-medium">Unresolved run queue items:</span>{" "}
                  {challenge._count.runSubmissions}
                </p>
                <p>
                  <span className="font-medium">Open participant votes:</span>{" "}
                  {challenge._count.participantVotes}
                </p>
                <p>
                  <span className="font-medium">Results finalized:</span>{" "}
                  {challenge.resultsFinalizedAt
                    ? challenge.resultsFinalizedAt.toLocaleString()
                    : "No (unresolved)"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
