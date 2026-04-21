import type { ReactNode } from "react";

import Link from "next/link";

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="min-h-screen bg-slate-950">
      <header className="border-b border-slate-800">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
          <p className="text-sm font-medium text-slate-200">Admin Shell (placeholder)</p>
          <Link className="text-sm text-slate-300 hover:text-white" href="/">
            Back to public site
          </Link>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl p-6">{children}</main>
    </div>
  );
}
