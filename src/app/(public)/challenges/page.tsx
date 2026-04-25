import Link from "next/link";

import { PublicChallengeStateBadge } from "@/components/challenges/public-challenge-state";
import { getPublicChallengeDirectoryFromDb } from "@/lib/challenges/public-repository";

function formatUtcDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

export default async function ChallengesDirectoryPage() {
  const challenges = await getPublicChallengeDirectoryFromDb();

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-3xl font-bold">Challenges</h1>
        <p className="mt-2 text-sm text-slate-300">
          Browse currently public challenge pages. Challenge actions will be added in later packets.
        </p>
      </header>

      {challenges.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-sm text-slate-300">
          No public challenges are available right now.
        </div>
      ) : (
        <ul className="space-y-4">
          {challenges.map((challenge) => (
            <li
              key={challenge.id}
              className="rounded-xl border border-slate-800 bg-slate-900/60 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  <Link
                    className="text-indigo-300 hover:text-indigo-200 hover:underline"
                    href={`/challenges/${challenge.slug}`}
                  >
                    {challenge.title}
                  </Link>
                </h2>
                <PublicChallengeStateBadge status={challenge.status} />
              </div>

              <div className="mt-4">
                {challenge.coverImageUrl ? (
                  <img
                    alt={`${challenge.title} cover image`}
                    className="h-44 w-full rounded-lg object-cover"
                    src={challenge.coverImageUrl}
                  />
                ) : (
                  <div className="flex h-44 w-full items-center justify-center rounded-lg border border-dashed border-slate-700 bg-slate-950/60 text-sm text-slate-400">
                    No approved cover image yet
                  </div>
                )}
              </div>

              <p className="mt-3 text-sm text-slate-300">{challenge.shortDescription}</p>

              <dl className="mt-4 grid gap-3 text-xs text-slate-400 sm:grid-cols-3">
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">Creator</dt>
                  <dd className="mt-1 text-slate-200">{challenge.creatorDisplayName}</dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">
                    Submission opens
                  </dt>
                  <dd className="mt-1 text-slate-200">
                    {formatUtcDate(challenge.submissionOpensAt)} UTC
                  </dd>
                </div>
                <div>
                  <dt className="font-semibold uppercase tracking-wide text-slate-500">
                    Submission closes
                  </dt>
                  <dd className="mt-1 text-slate-200">
                    {formatUtcDate(challenge.submissionClosesAt)} UTC
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
