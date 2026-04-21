import type { ReactNode } from "react";

import { Footer } from "./footer";
import { TopNavigation } from "./top-navigation";

type PublicShellProps = {
  children: ReactNode;
};

export function PublicShell({ children }: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNavigation />
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
      <Footer />
    </div>
  );
}
