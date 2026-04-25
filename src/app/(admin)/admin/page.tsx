import Link from "next/link";
import { redirect } from "next/navigation";

import { userHasAdminVerifierReviewAuthority } from "@/lib/auth/authorization";
import { getSession } from "@/lib/auth/session";
import { listPendingVerifierEligibilityRequests } from "@/lib/verifier-eligibility/admin-review-repository";

import { approveVerifierRequestAction, rejectVerifierRequestAction } from "./actions";

type AdminVerifierRequestReviewPageProps = {
  searchParams?: Promise<{
    approved?: string;
    rejected?: string;
    membershipCreated?: string;
    membershipRevoked?: string;
    error?: string;
  }>;
};

export default async function AdminVerifierRequestReviewPage({ searchParams }: AdminVerifierRequestReviewPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/admin");
  }

  const hasAuthority = await userHasAdminVerifierReviewAuthority(session.user.id);

  if (!hasAuthority) {
    redirect("/dashboard");
  }

  const params = searchParams ? await searchParams : undefined;
  const pendingRequests = await listPendingVerifierEligibilityRequests();

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold text-slate-100">Admin verifier request review</h1>
        <p className="mt-2 text-sm text-slate-300">
          Review pending verifier eligibility requests and explicitly approve or reject each request.
        </p>
      </header>

      {params?.approved === "1" ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Request approved.
          {params.membershipCreated === "1"
            ? " Verifier pool membership was created."
            : " Verifier pool membership already existed."}
        </p>
      ) : null}

      {params?.rejected === "1" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Request rejected.
          {params.membershipRevoked === "1"
            ? " Existing verifier pool membership was revoked."
            : " No active verifier pool membership needed revocation."}
        </p>
      ) : null}

      {params?.error === "forbidden" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          You do not have authority to review verifier requests.
        </p>
      ) : null}

      {params?.error === "invalid_request" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Invalid verifier request selection.
        </p>
      ) : null}

      {params?.error === "reject_note_required" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Reject decisions require notes.
        </p>
      ) : null}

      {params?.error === "request_not_found" ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Request was not found.
        </p>
      ) : null}

      {params?.error === "request_not_pending" ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          Request is no longer pending review.
        </p>
      ) : null}

      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        <h2 className="text-lg font-medium text-slate-100">Pending requests</h2>

        {pendingRequests.length < 1 ? (
          <p className="mt-3 text-sm text-slate-300">No pending verifier eligibility requests.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pendingRequests.map((request) => (
              <li key={request.id} className="rounded-lg border border-slate-800 bg-slate-950/60 p-4">
                <div className="space-y-1 text-sm text-slate-200">
                  <p>
                    <span className="font-medium">Request ID:</span> {request.id}
                  </p>
                  <p>
                    <span className="font-medium">User:</span> {request.user.displayName} (@{request.user.username})
                  </p>
                  <p>
                    <span className="font-medium">Email:</span> {request.user.email}
                  </p>
                  <p>
                    <span className="font-medium">Submitted:</span> {request.createdAt.toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium">Reason:</span> {request.reasonText}
                  </p>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <form action={approveVerifierRequestAction} className="space-y-3 rounded-md border border-emerald-800/50 p-3">
                    <input name="requestId" type="hidden" value={request.id} />
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-emerald-200" htmlFor={`approve-note-${request.id}`}>
                        Approval note (optional)
                      </label>
                      <textarea
                        className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        id={`approve-note-${request.id}`}
                        name="decisionNote"
                      />
                    </div>
                    <button className="rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500" type="submit">
                      Approve request
                    </button>
                  </form>

                  <form action={rejectVerifierRequestAction} className="space-y-3 rounded-md border border-rose-800/50 p-3">
                    <input name="requestId" type="hidden" value={request.id} />
                    <div>
                      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-rose-200" htmlFor={`reject-note-${request.id}`}>
                        Rejection note (required)
                      </label>
                      <textarea
                        className="h-24 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                        id={`reject-note-${request.id}`}
                        name="decisionNote"
                        required
                      />
                    </div>
                    <button className="rounded-md bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500" type="submit">
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
