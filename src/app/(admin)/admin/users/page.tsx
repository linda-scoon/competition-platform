import { AdminOperationsNav } from "@/app/(admin)/admin/_components/admin-operations-nav";
import { listAdminUserOperationsFromDb } from "@/lib/admin/operations-repository";

import { requireAdminAccess } from "../_lib/require-admin-access";

export default async function AdminUsersPage() {
  await requireAdminAccess("/admin/users");

  const users = await listAdminUserOperationsFromDb();

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">User operations</h1>
        <p className="mt-2 text-sm text-slate-300">
          Operational visibility for suspended users and pending verifier-review users.
        </p>
      </header>

      <AdminOperationsNav currentPath="/admin/users" />

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {users.length < 1 ? (
          <p className="text-sm text-slate-300">No operational user items found.</p>
        ) : (
          <ul className="space-y-3 text-sm text-slate-200">
            {users.map((user) => (
              <li key={user.id} className="rounded-md border border-slate-800 bg-slate-950/60 p-3">
                <p>
                  <span className="font-medium">User:</span> {user.displayName} (@{user.username})
                </p>
                <p>
                  <span className="font-medium">Email:</span> {user.email}
                </p>
                <p>
                  <span className="font-medium">Suspended:</span> {user.isSuspended ? "Yes" : "No"}
                </p>
                <p>
                  <span className="font-medium">Pending verifier requests:</span>{" "}
                  {user._count.verifierRequests}
                </p>
                <p>
                  <span className="font-medium">Active roles:</span> {user._count.roleAssignments}
                </p>
                <p>
                  <span className="font-medium">Blocks given / received:</span>{" "}
                  {user._count.blocksGiven} / {user._count.blocksReceived}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
