import Link from "next/link";

import { signUpAction } from "./actions";

type SignUpPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center p-6">
      <div className="w-full rounded-xl border border-slate-700 bg-slate-900/60 p-6">
        <h1 className="text-2xl font-semibold">Sign up</h1>
        <p className="mt-2 text-sm text-slate-300">Create your account to join competitions.</p>

        {params.error ? (
          <p className="mt-4 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            {params.error === "email_exists" ? "Email already in use." : "Please check your details and try again."}
          </p>
        ) : null}

        <form action={signUpAction} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block">Display name</span>
            <input
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
              type="text"
              name="name"
              required
            />
          </label>
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
          <label className="block text-sm">
            <span className="mb-1 block">Confirm password</span>
            <input
              className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2"
              type="password"
              name="confirmPassword"
              minLength={8}
              required
            />
          </label>
          <button className="w-full rounded-md bg-indigo-500 px-3 py-2 font-medium text-white hover:bg-indigo-400" type="submit">
            Create account
          </button>
        </form>

        <p className="mt-4 text-sm text-slate-300">
          Already have an account? <Link className="text-indigo-300 underline" href="/sign-in">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
