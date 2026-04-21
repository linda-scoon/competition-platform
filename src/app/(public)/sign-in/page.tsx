import Link from "next/link";

import { normalizeReturnTo } from "@/lib/auth/return-to-origin";

import { signInAction } from "./actions";

type SignInPageProps = {
  searchParams: Promise<{
    error?: string;
    returnTo?: string;
  }>;
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;
  const returnTo = normalizeReturnTo(params.returnTo);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center p-6">
      <div className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-300">Access protected pages and continue where you left off.</p>

        {params.error ? (
          <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            Invalid email or password.
          </p>
        ) : null}

        <form action={signInAction} className="mt-6 space-y-4">
          <input type="hidden" name="returnTo" value={returnTo} />
          <label className="block text-sm">
            <span className="mb-1 block">Email</span>
            <input
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
              type="email"
              name="email"
              required
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block">Password</span>
            <input
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
              type="password"
              name="password"
              minLength={8}
              required
            />
          </label>
          <button className="w-full rounded-md bg-indigo-500 px-3 py-2 font-medium text-white hover:bg-indigo-400" type="submit">
            Sign in
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-300">
          New here? <Link className="text-indigo-300 underline" href="/sign-up">Create an account</Link>
        </p>
      </div>
    </main>
  );
}
