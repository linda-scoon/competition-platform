import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";

import { signOutAction } from "./sign-out-action";

export default async function DashboardPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard");
  }

  const user = session.user;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center p-6">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-3 text-slate-300">Signed in as {user.email}.</p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          className="rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
          href="/challenges/new"
        >
          Create challenge draft
        </Link>
        <Link
          className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          href="/dashboard/verifier-eligibility"
        >
          Verifier eligibility request
        </Link>
        <Link
          className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          href="/dashboard/media"
        >
          Media library
        </Link>
        <Link
          className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          href="/dashboard/profile"
        >
          Profile settings
        </Link>
        <Link
          className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
          href="/dashboard/notifications"
        >
          Notifications center
        </Link>
      </div>

      <form className="mt-8" action={signOutAction}>
        <button
          className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium hover:bg-slate-800"
          type="submit"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
