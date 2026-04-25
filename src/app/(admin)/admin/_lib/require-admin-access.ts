import { redirect } from "next/navigation";

import { userHasAdminVerifierReviewAuthority } from "@/lib/auth/authorization";
import { getSession } from "@/lib/auth/session";

export async function requireAdminAccess(returnTo: string) {
  const session = await getSession();

  if (!session?.user) {
    redirect(`/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }

  const hasAuthority = await userHasAdminVerifierReviewAuthority(session.user.id);

  if (!hasAuthority) {
    redirect("/dashboard");
  }
}
