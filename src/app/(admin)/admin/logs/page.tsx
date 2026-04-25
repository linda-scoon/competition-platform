import { AdminOperationsNav } from "@/app/(admin)/admin/_components/admin-operations-nav";
import { listRecentAdminAuditLogsFromDb } from "@/lib/admin/operations-repository";

import { requireAdminAccess } from "../_lib/require-admin-access";

export default async function AdminLogsPage() {
  await requireAdminAccess("/admin/logs");

  const auditLogs = await listRecentAdminAuditLogsFromDb();

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Admin logs</h1>
        <p className="mt-2 text-sm text-slate-300">
          Recent audit entries for operational visibility.
        </p>
      </header>

      <AdminOperationsNav currentPath="/admin/logs" />

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {auditLogs.length < 1 ? (
          <p className="text-sm text-slate-300">No audit entries found.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-200">
            {auditLogs.map((entry) => (
              <li key={entry.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <p>
                  <span className="font-medium">{entry.actionType}</span> {entry.objectType} (
                  {entry.objectId})
                </p>
                <p>
                  <span className="font-medium">Actor:</span>{" "}
                  {entry.actorUser
                    ? `${entry.actorUser.displayName} (@${entry.actorUser.username})`
                    : entry.actorType}
                </p>
                <p>
                  <span className="font-medium">Reason:</span> {entry.reason ?? "—"}
                </p>
                <p>
                  <span className="font-medium">At:</span> {entry.createdAt.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
