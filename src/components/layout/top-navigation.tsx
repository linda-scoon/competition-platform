import Link from "next/link";

const publicLinks = [
  { href: "/", label: "Home" },
  { href: "/challenges", label: "Challenges" },
];

export function TopNavigation() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/70">
      <nav className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
        <Link className="text-sm font-semibold tracking-wide text-slate-100" href="/">
          Competition Platform
        </Link>

        <div className="flex items-center gap-4 text-sm text-slate-200">
          {publicLinks.map((link) => (
            <Link key={link.href} className="hover:text-white" href={link.href}>
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3 text-sm">
          <Link className="text-slate-200 hover:text-white" href="/sign-in">
            Sign in
          </Link>
          <Link className="rounded-md bg-indigo-500 px-3 py-1.5 font-medium text-white hover:bg-indigo-400" href="/sign-up">
            Sign up
          </Link>
        </div>
      </nav>
    </header>
  );
}
