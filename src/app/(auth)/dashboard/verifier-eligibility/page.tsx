import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getVerifierEligibilityViewState } from "@/lib/verifier-eligibility/repository";

import { createVerifierEligibilityRequestAction } from "./actions";

type VerifierEligibilityPageProps = {
  searchParams?: Promise<{
    created?: string;
    error?: string;
  }>;
};

function formatRequestStatus(status: "PENDING" | "APPROVED" | "REJECTED"): string {
  if (status === "PENDING") {
    return "Pending review";
  }

  if (status === "APPROVED") {
    return "Approved";
  }

  return "Rejected";
}

export default async function VerifierEligibilityPage({ searchParams }: VerifierEligibilityPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/verifier-eligibility");
  }

  const params = searchParams ? await searchParams : undefined;
  const viewState = await getVerifierEligibilityViewState(session.user.id);

  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-3xl font-semibold text-slate-100">Verifier eligibility request</h1>
      <p className="mt-2 text-slate-300">
        Request entry to the verifier pool. Submitting a request does not grant verifier access automatically.
      </p>

      {params?.created === "1" ? (
        <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          Your verifier eligibility request was submitted.
        </p>
      ) : null}

      {params?.error === "invalid_reason" ? (
        <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">
          Please provide a short reason before submitting.
        </p>
      ) : null}

      {params?.error === "already_eligible" ? (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          You already have active verifier eligibility.
        </p>
      ) : null}

      {params?.error === "request_exists" ? (
        <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          You already have a verifier eligibility request on file.
        </p>
      ) : null}

      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-lg font-medium text-slate-100">Current status</h2>

        {viewState.state === "ACTIVE_ELIGIBILITY" ? (
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            <p className="font-medium text-emerald-300">Active</p>
            <p>Granted on {viewState.membershipGrantedAt.toLocaleString()}.</p>
          </div>
        ) : null}

        {viewState.state === "REQUEST_EXISTS" ? (
          <div className="mt-3 space-y-2 text-sm text-slate-200">
            <p>
              <span className="font-medium">Request status:</span> {formatRequestStatus(viewState.request.status)}
            </p>
            <p>
              <span className="font-medium">Submitted:</span> {viewState.request.createdAt.toLocaleString()}
            </p>
            <p>
              <span className="font-medium">Reason:</span> {viewState.request.reasonText}
            </p>
            {viewState.request.decidedAt ? (
              <p>
                <span className="font-medium">Decision time:</span> {viewState.request.decidedAt.toLocaleString()}
              </p>
            ) : null}
            {viewState.request.decisionNote ? (
              <p>
                <span className="font-medium">Decision note:</span> {viewState.request.decisionNote}
              </p>
            ) : null}
          </div>
        ) : null}

        {viewState.state === "NO_REQUEST" ? (
          <p className="mt-3 text-sm text-slate-300">No verifier eligibility request has been submitted yet.</p>
        ) : null}
      </section>

      <section className="mt-8 rounded-lg border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="text-lg font-medium text-slate-100">Submit request</h2>

        {viewState.state === "NO_REQUEST" ? (
          <form action={createVerifierEligibilityRequestAction} className="mt-4 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-200" htmlFor="reasonText">
                Why do you want to be a verifier?
              </label>
              <textarea
                className="h-32 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100"
                id="reasonText"
                name="reasonText"
                required
              />
            </div>
            <button
              className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
              type="submit"
            >
              Submit request
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-slate-300">
            A new request cannot be submitted because you already have an existing eligibility state.
          </p>
        )}
      </section>

      <div className="mt-8">
        <Link className="text-sm text-indigo-300 hover:text-indigo-200" href="/dashboard">
          Back to dashboard
        </Link>
      </div>
    </main>
  );
}
