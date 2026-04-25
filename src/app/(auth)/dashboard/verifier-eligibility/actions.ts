"use server";

import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { createVerifierEligibilityRequestInDb } from "@/lib/verifier-eligibility/repository";

export async function createVerifierEligibilityRequestAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/verifier-eligibility");
  }

  const reasonText = String(formData.get("reasonText") ?? "").trim();

  if (reasonText.length < 1) {
    redirect("/dashboard/verifier-eligibility?error=invalid_reason");
  }

  const result = await createVerifierEligibilityRequestInDb({
    userId: session.user.id,
    reasonText,
  });

  if (result.outcome === "CREATED") {
    redirect("/dashboard/verifier-eligibility?created=1");
  }

  if (result.outcome === "HAS_ACTIVE_ELIGIBILITY") {
    redirect("/dashboard/verifier-eligibility?error=already_eligible");
  }

  redirect("/dashboard/verifier-eligibility?error=request_exists");
}
