"use server";

import { redirect } from "next/navigation";

import { userHasAdminVerifierReviewAuthority } from "@/lib/auth/authorization";
import { getSession } from "@/lib/auth/session";
import {
  approveVerifierEligibilityRequestInDb,
  rejectVerifierEligibilityRequestInDb,
} from "@/lib/verifier-eligibility/admin-review-repository";

export async function approveVerifierRequestAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/admin");
  }

  const hasAuthority = await userHasAdminVerifierReviewAuthority(session.user.id);

  if (!hasAuthority) {
    redirect("/admin?error=forbidden");
  }

  const requestId = String(formData.get("requestId") ?? "").trim();

  if (!requestId) {
    redirect("/admin?error=invalid_request");
  }

  const decisionNote = String(formData.get("decisionNote") ?? "").trim();

  const result = await approveVerifierEligibilityRequestInDb({
    requestId,
    decidedByUserId: session.user.id,
    decisionNote,
  });

  if (result.outcome === "APPROVED") {
    redirect(`/admin?approved=1&membershipCreated=${result.membershipCreated ? "1" : "0"}`);
  }

  if (result.outcome === "REQUEST_NOT_FOUND") {
    redirect("/admin?error=request_not_found");
  }

  redirect("/admin?error=request_not_pending");
}

export async function rejectVerifierRequestAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/admin");
  }

  const hasAuthority = await userHasAdminVerifierReviewAuthority(session.user.id);

  if (!hasAuthority) {
    redirect("/admin?error=forbidden");
  }

  const requestId = String(formData.get("requestId") ?? "").trim();
  const decisionNote = String(formData.get("decisionNote") ?? "").trim();

  if (!requestId) {
    redirect("/admin?error=invalid_request");
  }

  if (!decisionNote) {
    redirect("/admin?error=reject_note_required");
  }

  const result = await rejectVerifierEligibilityRequestInDb({
    requestId,
    decidedByUserId: session.user.id,
    decisionNote,
  });

  if (result.outcome === "REJECTED") {
    redirect(`/admin?rejected=1&membershipRevoked=${result.membershipRevoked ? "1" : "0"}`);
  }

  if (result.outcome === "REQUEST_NOT_FOUND") {
    redirect("/admin?error=request_not_found");
  }

  redirect("/admin?error=request_not_pending");
}
