import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { PublicChallengeStateBadge } from "@/components/challenges/public-challenge-state";
import { getPublicChallengeDetailBySlugFromDb } from "@/lib/challenges/public-repository";
import { joinChallengeAction } from "./actions";

type ChallengeDetailPageProps = {
  params: Promise<{ challengeSlug: string }>;
  searchParams: Promise<{ tab?: string; join?: string }>;
};

const DETAIL_TABS = [
  { key: "overview", label: "Overview" },
  { key: "rules", label: "Rules" },
  { key: "scoring", label: "Scoring" },
  { key: "evidence", label: "Evidence policy" },
  { key: "leaderboard", label: "Leaderboard" },
] as const;

function formatUtcDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

function formatJsonBlock(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    Object.keys(value as Record<string, unknown>).length === 0
  ) {
    return "No public content has been provided yet.";
  }

  return JSON.stringify(value, null, 2);
}

export async function generateMetadata({ params }: ChallengeDetailPageProps): Promise<Metadata> {
  const { challengeSlug } = await params;
  const challenge = await getPublicChallengeDetailBySlugFromDb(challengeSlug);

  if (!challenge) {
    return {
      title: "Challenge not found",
      description: "The requested challenge is not publicly available.",
    };
  }

  return {
    title: `${challenge.title} | Challenges`,
    description: challenge.shortDescription,
  };
}

export default async function ChallengeDetailPage({
  params,
  searchParams,
}: ChallengeDetailPageProps) {
  const { challengeSlug } = await params;
  const { tab, join } = await searchParams;
  const session = await getSession();

  const challenge = await getPublicChallengeDetailBySlugFromDb(challengeSlug);

  if (!challenge) {
    notFound();
  }

  const activeTab = DETAIL_TABS.some((candidateTab) => candidateTab.key === tab) ? tab : "overview";
  const joinAction = joinChallengeAction.bind(null, { challengeSlug: challenge.slug });
  const joinMessage =
    join === "joined"
      ? "You joined this challenge."
      : join === "joined_soft_locked"
        ? "You joined this challenge. First participant joined: this challenge is now soft locked."
        : join === "already_joined"
          ? "You are already an active participant."
          : join === "owner_cannot_join"
            ? "Challenge creators cannot join their own challenge."
            : join === "window_not_open"
              ? "Joining is not open yet for this challenge."
              : join === "window_closed"
                ? "Joining is closed for this challenge."
                : join === "ineligible"
                  ? "This challenge is not eligible for joining."
                  : null;

  return (
    <section className="space-y-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">{challenge.title}</h1>
          <PublicChallengeStateBadge status={challenge.status} />
        </div>
        <p className="mt-2 text-sm text-slate-300">{challenge.shortDescription}</p>

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

        <div className="mt-6 space-y-3">
          {session?.user ? (
            <form action={joinAction}>
              <button
                type="submit"
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Join challenge
              </button>
            </form>
          ) : (
            <p className="text-sm text-slate-300">
              <Link
                className="font-medium text-indigo-300 hover:text-indigo-200"
                href={`/sign-in?returnTo=/challenges/${challenge.slug}`}
              >
                Sign in
              </Link>{" "}
              to join this challenge.
            </p>
          )}

          {joinMessage ? (
            <p className="rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-200">
              {joinMessage}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
        aria-label="Challenge detail tabs"
      >
        <ul className="flex flex-wrap gap-2">
          {DETAIL_TABS.map((detailTab) => {
            const isActive = detailTab.key === activeTab;

            return (
              <li key={detailTab.key}>
                <Link
                  className={`inline-flex rounded-md px-3 py-2 text-sm ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800/70 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
                  }`}
                  href={`/challenges/${challenge.slug}?tab=${detailTab.key}`}
                >
                  {detailTab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        {activeTab === "overview" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Overview</h2>
            <p className="whitespace-pre-line text-sm text-slate-200">
              {challenge.longDescription}
            </p>
          </div>
        ) : activeTab === "rules" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Rules</h2>
            <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200">
              {formatJsonBlock(challenge.rulesSnapshot)}
            </pre>
          </div>
        ) : activeTab === "scoring" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Scoring</h2>
            <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200">
              {formatJsonBlock(challenge.scoringSnapshot)}
            </pre>
          </div>
        ) : activeTab === "evidence" ? (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Evidence policy</h2>
            <pre className="overflow-x-auto rounded-md border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-200">
              {formatJsonBlock(challenge.evidencePolicySnapshot)}
            </pre>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Leaderboard</h2>
            <p className="text-sm text-slate-300">
              Leaderboard data will be added in later packets.
            </p>
          </div>
        )}
      </article>
    </section>
  );
}
