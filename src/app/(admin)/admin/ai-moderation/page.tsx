import { AdminOperationsNav } from "@/app/(admin)/admin/_components/admin-operations-nav";
import { listAdminAIModerationItemsFromDb } from "@/lib/admin/operations-repository";

import { requireAdminAccess } from "../_lib/require-admin-access";

export default async function AdminAiModerationPage() {
  await requireAdminAccess("/admin/ai-moderation");

  const moderationItems = await listAdminAIModerationItemsFromDb();

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">AI moderation operations</h1>
        <p className="mt-2 text-sm text-slate-300">
          Pending challenge and media moderation queues that require admin visibility.
        </p>
      </header>

      <AdminOperationsNav currentPath="/admin/ai-moderation" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-lg font-medium text-slate-100">Pending challenge versions</h2>
          {moderationItems.pendingChallengeVersions.length < 1 ? (
            <p className="mt-3 text-sm text-slate-300">No pending challenge versions.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {moderationItems.pendingChallengeVersions.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
                >
                  <p>
                    <span className="font-medium">Challenge:</span> {item.challenge.title} (
                    {item.challenge.slug})
                  </p>
                  <p>
                    <span className="font-medium">Version:</span> {item.versionNumber}
                  </p>
                  <p>
                    <span className="font-medium">Submitted by:</span>{" "}
                    {item.createdByUser.displayName} (@
                    {item.createdByUser.username})
                  </p>
                  <p>
                    <span className="font-medium">Created:</span> {item.createdAt.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h2 className="text-lg font-medium text-slate-100">Pending media moderation</h2>
          {moderationItems.pendingMediaAssets.length < 1 ? (
            <p className="mt-3 text-sm text-slate-300">No pending media moderation items.</p>
          ) : (
            <ul className="mt-3 space-y-3 text-sm text-slate-200">
              {moderationItems.pendingMediaAssets.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
                >
                  <p>
                    <span className="font-medium">Media ID:</span> {item.id}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span> {item.type}
                  </p>
                  <p>
                    <span className="font-medium">Owner:</span> {item.ownerUser.displayName} (@
                    {item.ownerUser.username})
                  </p>
                  <p>
                    <span className="font-medium">Created:</span> {item.createdAt.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
