import Link from "next/link";

import { AdminOperationsNav } from "@/app/(admin)/admin/_components/admin-operations-nav";
import {
  getAdminOperationsOverviewFromDb,
  listProblemContactRelayMessagesFromDb,
} from "@/lib/admin/operations-repository";
import { listPendingMediaAssetsForAdminFromDb } from "@/lib/media/repository";
import { listPendingVerifierEligibilityRequests } from "@/lib/verifier-eligibility/admin-review-repository";

import {
  approveVerifierRequestAction,
  moderatePendingMediaAssetAction,
  rejectVerifierRequestAction,
} from "./actions";
import { requireAdminAccess } from "./_lib/require-admin-access";

type AdminVerifierRequestReviewPageProps = {
  searchParams?: Promise<{
    approved?: string;
    rejected?: string;
    membershipCreated?: string;
    membershipRevoked?: string;
    media?: string;
    error?: string;
  }>;
};

export default async function AdminVerifierRequestReviewPage({
  searchParams,
}: AdminVerifierRequestReviewPageProps) {
  await requireAdminAccess("/admin");

  const params = searchParams ? await searchParams : undefined;
  const [overview, pendingRequests, pendingMediaAssets, relayMessages] = await Promise.all([
    getAdminOperationsOverviewFromDb(),
    listPendingVerifierEligibilityRequests(),
    listPendingMediaAssetsForAdminFromDb(),
    listProblemContactRelayMessagesFromDb(),
  ]);

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Admin operations</h1>
        <p className="mt-2 text-sm text-slate-300">
          Operational dashboard with queue visibility for logs, runs, challenges, users, and
          moderation.
        </p>
      </header>

      <AdminOperationsNav currentPath="/admin" />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <OperationalCard label="Audit logs" value={overview.auditLogCount} />
        <OperationalCard label="Runs in queue" value={overview.runQueueCount} />
        <OperationalCard
          label="Unresolved closed challenges"
          value={overview.unresolvedClosedChallengeCount}
        />
        <OperationalCard
          label="Pending challenge moderation"
          value={overview.pendingChallengeVersionCount}
        />
        <OperationalCard
          label="Pending media moderation"
          value={overview.pendingMediaModerationCount}
        />
        <OperationalCard
          label="Failed contact relay messages"
          value={overview.failedContactRelayCount}
        />
      </div>

      {params?.approved === "1" ? (
        <p
          aria-live="polite"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200"
          role="status"
        >
          Request approved.
          {params.membershipCreated === "1"
            ? " Verifier pool membership was created."
            : " Verifier pool membership already existed."}
        </p>
      ) : null}

      {params?.rejected === "1" ? (
        <p
          aria-live="polite"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200"
          role="status"
        >
          Request rejected.
          {params.membershipRevoked === "1"
            ? " Existing verifier pool membership was revoked."
            : " No active verifier pool membership needed revocation."}
        </p>
      ) : null}

      {params?.media === "approved" ? (
        <p
          aria-live="polite"
          className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200"
          role="status"
        >
          Media asset approved.
        </p>
      ) : null}

      {params?.media === "rejected" ? (
        <p
          aria-live="polite"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200"
          role="status"
        >
          Media asset rejected.
        </p>
      ) : null}

      {params?.media === "removed" ? (
        <p
          aria-live="polite"
          className="rounded-md border border-slate-600 bg-slate-900/80 p-3 text-sm text-slate-200"
          role="status"
        >
          Media asset removed.
        </p>
      ) : null}

      {params?.error === "forbidden" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          You do not have authority to review verifier requests.
        </p>
      ) : null}

      {params?.error === "invalid_request" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          Invalid verifier request selection.
        </p>
      ) : null}

      {params?.error === "reject_note_required" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          Reject decisions require notes.
        </p>
      ) : null}

      {params?.error === "request_not_found" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          Request was not found.
        </p>
      ) : null}

      {params?.error === "request_not_pending" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200"
          role="alert"
        >
          Request is no longer pending review.
        </p>
      ) : null}

      {params?.error === "invalid_media_asset" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          Invalid media asset selection.
        </p>
      ) : null}

      {params?.error === "invalid_media_decision" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          Invalid media moderation decision.
        </p>
      ) : null}

      {params?.error === "media_not_found" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          Media asset not found.
        </p>
      ) : null}

      {params?.error === "media_not_pending" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200"
          role="alert"
        >
          Media asset is no longer pending moderation.
        </p>
      ) : null}

      {params?.error === "media_note_required" ? (
        <p
          aria-live="assertive"
          className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200"
          role="alert"
        >
          Reject and remove decisions require notes.
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Operational contact relay queue</h2>
        {relayMessages.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">No queued or failed relay messages.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-200">
            {relayMessages.slice(0, 8).map((relayMessage) => (
              <li
                key={relayMessage.id}
                className="rounded-md border border-slate-800 bg-slate-950/60 p-3"
              >
                <p>
                  <span className="font-medium">Status:</span> {relayMessage.deliveryStatus}
                </p>
                <p>
                  <span className="font-medium">From:</span> {relayMessage.senderUser.displayName}{" "}
                  (@
                  {relayMessage.senderUser.username})
                </p>
                <p>
                  <span className="font-medium">To:</span> {relayMessage.recipientUser.displayName}{" "}
                  (@
                  {relayMessage.recipientUser.username})
                </p>
                <p>
                  <span className="font-medium">Created:</span>{" "}
                  {relayMessage.createdAt.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-slate-400">
          Showing first 8 items. Full queue visibility is on page-specific views.
        </p>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Pending media uploads</h2>

        {pendingMediaAssets.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">No pending media assets.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingMediaAssets.map((asset) => (
              <li key={asset.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
                  <img
                    alt="Pending media asset preview"
                    className="h-44 w-full rounded-md object-cover"
                    src={asset.storageKey}
                  />
                  <div>
                    <div className="space-y-1 text-sm text-slate-200">
                      <p>
                        <span className="font-medium">Media ID:</span> {asset.id}
                      </p>
                      <p>
                        <span className="font-medium">Type:</span> {asset.type}
                      </p>
                      <p>
                        <span className="font-medium">MIME:</span> {asset.mimeType}
                      </p>
                      <p>
                        <span className="font-medium">Owner:</span> {asset.ownerUser.displayName} (@
                        {asset.ownerUser.username})
                      </p>
                      <p>
                        <span className="font-medium">Owner email:</span> {asset.ownerUser.email}
                      </p>
                      <p>
                        <span className="font-medium">Uploaded:</span>{" "}
                        {asset.createdAt.toLocaleString()}
                      </p>
                    </div>

                    <form action={moderatePendingMediaAssetAction} className="mt-4 space-y-3">
                      <input name="mediaAssetId" type="hidden" value={asset.id} />

                      <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">
                        Decision
                        <select
                          className="mt-1 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                          defaultValue="approve"
                          name="decision"
                        >
                          <option value="approve">Approve</option>
                          <option value="reject">Reject</option>
                          <option value="remove">Remove</option>
                        </select>
                      </label>

                      <label className="block text-xs font-medium uppercase tracking-wide text-slate-300">
                        Moderation note (required for reject/remove)
                        <textarea
                          className="mt-1 h-20 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                          name="decisionNote"
                        />
                      </label>

                      <button
                        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500"
                        type="submit"
                      >
                        Save moderation decision
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Pending verifier requests</h2>

        {pendingRequests.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">No pending verifier eligibility requests.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingRequests.map((request) => (
              <li
                key={request.id}
                className="rounded-lg border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="space-y-1 text-sm text-slate-200">
                  <p>
                    <span className="font-medium">Request ID:</span> {request.id}
                  </p>
                  <p>
                    <span className="font-medium">User:</span> {request.user.displayName} (@
                    {request.user.username})
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {request.user.email}
                  </p>
                  <p>
                    <span className="font-medium">Submitted:</span>{" "}
                    {request.createdAt.toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Reason:</span> {request.reasonText}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form
                    action={approveVerifierRequestAction}
                    className="space-y-3 rounded-md border border-emerald-800/50 p-3"
                  >
                    <input name="requestId" type="hidden" value={request.id} />
                    <div>
                      <label
                        className="mb-1 block text-xs font-medium uppercase tracking-wide text-emerald-200"
                        htmlFor={`approve-note-${request.id}`}
                      >
                        Approval note (optional)
                      </label>
                      <textarea
                        className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        id={`approve-note-${request.id}`}
                        name="decisionNote"
                      />
                    </div>
                    <button
                      className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      type="submit"
                    >
                      Approve request
                    </button>
                  </form>

                  <form
                    action={rejectVerifierRequestAction}
                    className="space-y-3 rounded-md border border-rose-800/50 p-3"
                  >
                    <input name="requestId" type="hidden" value={request.id} />
                    <div>
                      <label
                        className="mb-1 block text-xs font-medium uppercase tracking-wide text-rose-200"
                        htmlFor={`reject-note-${request.id}`}
                      >
                        Rejection note (required)
                      </label>
                      <textarea
                        className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        id={`reject-note-${request.id}`}
                        name="decisionNote"
                        required
                      />
                    </div>
                    <button
                      className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500"
                      type="submit"
                    >
                      Reject request
                    </button>
                  </form>
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

type OperationalCardProps = {
  label: string;
  value: number;
};

function OperationalCard({ label, value }: OperationalCardProps) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-100">{value}</p>
    </div>
  );
}
