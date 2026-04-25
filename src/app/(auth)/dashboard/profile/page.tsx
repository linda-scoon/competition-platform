import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  getProfileSettingsSnapshotFromDb,
  listBlockedUsersFromDb,
} from "@/lib/profiles/repository";

import { blockUserAction, setContactabilityAction, unblockUserAction } from "./actions";

type ProfileSettingsPageProps = {
  searchParams?: Promise<{ updated?: string; error?: string }>;
};

export default async function ProfileSettingsPage({ searchParams }: ProfileSettingsPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/profile");
  }

  const [blockedUsers, profileSettings, params] = await Promise.all([
    listBlockedUsersFromDb(session.user.id),
    getProfileSettingsSnapshotFromDb(session.user.id),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  if (!profileSettings) {
    redirect("/sign-in?returnTo=/dashboard/profile");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 p-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-3xl font-semibold">Profile settings</h1>
        <p className="mt-2 text-sm text-slate-300">
          Public profile:{" "}
          <Link
            className="text-indigo-300 hover:text-indigo-200"
            href={`/u/${profileSettings.username}`}
          >
            /u/{profileSettings.username}
          </Link>
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Contact relay is currently {profileSettings.isContactable ? "enabled" : "disabled"}.
        </p>
      </header>

      {params?.updated ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Settings updated.
        </p>
      ) : null}

      {params?.error ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          Could not process request: {params.error}.
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold">Contactability</h2>
        <p className="mt-2 text-sm text-slate-300">
          Allow other users to contact you through relay (email is never public).
        </p>
        <form action={setContactabilityAction} className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            name="isContactable"
            type="submit"
            value="true"
          >
            Enable contact relay
          </button>
          <button
            className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
            name="isContactable"
            type="submit"
            value="false"
          >
            Disable contact relay
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold">Blocked users</h2>
        <p className="mt-2 text-sm text-slate-300">
          Block by username to disable contact relay in both directions.
        </p>

        <form action={blockUserAction} className="mt-4 flex gap-3">
          <input
            className="flex-1 rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
            name="blockedUsername"
            placeholder="username"
            required
            type="text"
          />
          <button
            className="rounded-md bg-rose-700 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
            type="submit"
          >
            Block
          </button>
        </form>

        {blockedUsers.length < 1 ? (
          <p className="mt-4 text-sm text-slate-300">You have not blocked anyone.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {blockedUsers.map((block) => (
              <li
                key={block.blockedUser.id}
                className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-950/60 px-3 py-2"
              >
                <div>
                  <p className="text-sm text-slate-100">
                    {block.blockedUser.displayName} (@{block.blockedUser.username})
                  </p>
                  <p className="text-xs text-slate-400">
                    Blocked: {block.createdAt.toLocaleString()}
                  </p>
                </div>
                <form action={unblockUserAction}>
                  <input name="blockedUserId" type="hidden" value={block.blockedUser.id} />
                  <button
                    className="rounded-md border border-slate-600 px-3 py-1 text-xs hover:bg-slate-800"
                    type="submit"
                  >
                    Unblock
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
