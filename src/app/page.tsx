import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-3xl font-bold">Competition Platform</h1>
        <p className="mt-4 text-base text-slate-300">Auth foundation is ready.</p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link className="rounded-md bg-indigo-500 px-4 py-2 font-medium text-white hover:bg-indigo-400" href="/sign-in">
            Sign in
          </Link>
          <Link className="rounded-md border border-slate-600 px-4 py-2 font-medium hover:bg-slate-800" href="/sign-up">
            Sign up
          </Link>
        </div>
      </div>
    </main>
  );
}
