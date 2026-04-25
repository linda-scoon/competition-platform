import Link from "next/link";

const ADMIN_OPERATION_LINKS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/runs", label: "Runs" },
  { href: "/admin/challenges", label: "Challenges" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/ai-moderation", label: "AI Moderation" },
];

type AdminOperationsNavProps = {
  currentPath: string;
};

export function AdminOperationsNav({ currentPath }: AdminOperationsNavProps) {
  return (
    <nav className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <ul className="flex flex-wrap gap-2">
        {ADMIN_OPERATION_LINKS.map((link) => {
          const isActive = currentPath === link.href;

          return (
            <li key={link.href}>
              <Link
                className={`inline-flex rounded-md border px-3 py-2 text-sm transition ${
                  isActive
                    ? "border-indigo-400 bg-indigo-500/20 text-indigo-100"
                    : "border-slate-700 bg-slate-950 text-slate-200 hover:border-slate-500 hover:text-white"
                }`}
                href={link.href}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
