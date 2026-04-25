import { AdminOperationsNav } from "@/app/(admin)/admin/_components/admin-operations-nav";
import { listAdminOperationalRunsFromDb } from "@/lib/admin/operations-repository";

import { requireAdminAccess } from "../_lib/require-admin-access";

export default async function AdminRunsPage() {
  await requireAdminAccess("/admin/runs");

  const operationalRuns = await listAdminOperationalRunsFromDb();

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Run operations queue</h1>
        <p className="mt-2 text-sm text-slate-300">
          Visibility into run submissions waiting for review or correction.
        </p>
      </header>

      <AdminOperationsNav currentPath="/admin/runs" />

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {operationalRuns.length < 1 ? (
          <p className="text-sm text-slate-300">No active operational run queue items.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-200">
            {operationalRuns.map((run) => (
              <li key={run.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <p>
                  <span className="font-medium">Run:</span> {run.id}
                </p>
                <p>
                  <span className="font-medium">Status:</span> {run.status}
                </p>
                <p>
                  <span className="font-medium">Challenge:</span> {run.challenge.title} (
                  {run.challenge.slug})
                </p>
                <p>
                  <span className="font-medium">Participant:</span> {run.user.displayName} (@
                  {run.user.username})
                </p>
                <p>
                  <span className="font-medium">Claimed by:</span>{" "}
                  {run.claimedByVerifierUser
                    ? `${run.claimedByVerifierUser.displayName} (@${run.claimedByVerifierUser.username})`
                    : "Unclaimed"}
                </p>
                <p>
                  <span className="font-medium">Submitted:</span> {run.submittedAt.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
