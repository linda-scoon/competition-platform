import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { getPublicProfileByUsernameFromDb } from "@/lib/profiles/repository";
import { sendContactRelayAction } from "./contact/actions";

type PublicProfilePageProps = {
  params: Promise<{ username: string }>;
  searchParams?: Promise<{ contact?: string }>;
};

export async function generateMetadata({ params }: PublicProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfileByUsernameFromDb({ username });

  if (!profile) {
    return {
      title: "Profile not found",
    };
  }

  return {
    title: `${profile.displayName} (@${profile.username})`,
    description: profile.bio ?? `${profile.displayName}'s public competition profile`,
  };
}

export default async function PublicProfilePage({ params, searchParams }: PublicProfilePageProps) {
  const [{ username }, session, query] = await Promise.all([
    params,
    getSession(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  const profile = await getPublicProfileByUsernameFromDb({
    username,
    viewerUserId: session?.user?.id,
  });

  if (!profile) {
    notFound();
  }

  const canRenderContactForm =
    Boolean(session?.user) &&
    session?.user.id !== profile.userId &&
    profile.isContactable &&
    !profile.isBlockedBetweenUsers;

  const contactAction = sendContactRelayAction.bind(null, profile.username);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex items-center gap-4">
          {profile.avatarImageUrl ? (
            <img
              alt={`${profile.displayName} avatar`}
              className="h-20 w-20 rounded-full object-cover"
              src={profile.avatarImageUrl}
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-slate-700 bg-slate-950 text-xl font-medium text-slate-400">
              {profile.displayName.slice(0, 1).toUpperCase()}
            </div>
          )}

          <div>
            <h1 className="text-2xl font-semibold">{profile.displayName}</h1>
            <p className="text-sm text-slate-300">@{profile.username}</p>
          </div>
        </div>

        <p className="mt-4 whitespace-pre-line text-sm text-slate-200">
          {profile.bio?.trim().length ? profile.bio : "No bio provided."}
        </p>
      </section>

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold">Contact</h2>

        {!session?.user ? (
          <p className="mt-3 text-sm text-slate-300">
            <Link
              className="font-medium text-indigo-300 hover:text-indigo-200"
              href={`/sign-in?returnTo=/u/${profile.username}`}
            >
              Sign in
            </Link>{" "}
            to contact this user through relay.
          </p>
        ) : session.user.id === profile.userId ? (
          <p className="mt-3 text-sm text-slate-300">
            This is your profile. Use profile settings to manage contactability and blocked users.
          </p>
        ) : profile.isBlockedBetweenUsers ? (
          <p className="mt-3 text-sm text-slate-300">
            Contact is unavailable because one of you has blocked the other.
          </p>
        ) : !profile.isContactable ? (
          <p className="mt-3 text-sm text-slate-300">
            This user is not accepting contact relay messages.
          </p>
        ) : null}

        {query?.contact === "sent" ? (
          <p className="mt-4 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            Message submitted to contact relay.
          </p>
        ) : null}

        {query?.contact === "body_required" ? (
          <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            Message body is required.
          </p>
        ) : null}

        {query?.contact === "blocked" || query?.contact === "not_contactable" ? (
          <p className="mt-4 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            Message could not be relayed due to privacy settings.
          </p>
        ) : null}

        {canRenderContactForm ? (
          <form
            action={contactAction}
            className="mt-4 space-y-3 rounded-lg border border-slate-800 bg-slate-950/60 p-4"
          >
            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Subject (optional)</span>
              <input
                className="w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
                maxLength={160}
                name="subject"
                type="text"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-slate-300">Message</span>
              <textarea
                className="min-h-28 w-full rounded-md border border-slate-600 bg-slate-950 px-3 py-2 text-sm"
                maxLength={2000}
                name="body"
                required
              />
            </label>

            <button
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              type="submit"
            >
              Send via relay
            </button>
            <p className="text-xs text-slate-400">Email addresses are never shown publicly.</p>
          </form>
        ) : null}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold">Created challenges</h2>
          {profile.createdChallenges.length < 1 ? (
            <p className="mt-3 text-sm text-slate-300">No public created challenges.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {profile.createdChallenges.map((challenge) => (
                <li
                  key={challenge.id}
                  className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm"
                >
                  <Link
                    className="font-medium text-indigo-300 hover:text-indigo-200"
                    href={`/challenges/${challenge.slug}`}
                  >
                    {challenge.title}
                  </Link>
                  <p className="text-xs text-slate-400">{challenge.status}</p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold">Joined challenges</h2>
          {profile.joinedChallenges.length < 1 ? (
            <p className="mt-3 text-sm text-slate-300">No public joined challenges.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {profile.joinedChallenges.map((challenge) => (
                <li
                  key={challenge.id}
                  className="rounded-md border border-slate-800 bg-slate-950/60 p-3 text-sm"
                >
                  <Link
                    className="font-medium text-indigo-300 hover:text-indigo-200"
                    href={`/challenges/${challenge.slug}`}
                  >
                    {challenge.title}
                  </Link>
                  <p className="text-xs text-slate-400">{challenge.status}</p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
