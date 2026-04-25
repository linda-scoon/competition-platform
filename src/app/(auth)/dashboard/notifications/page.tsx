import type { NotificationType } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  listNotificationsForUserFromDb,
  type NotificationItem,
} from "@/lib/notifications/repository";

import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
  markNotificationUnreadAction,
} from "./actions";

type NotificationsPageProps = {
  searchParams?: Promise<{
    updated?: string;
    error?: string;
  }>;
};

function readString(payload: Record<string, unknown>, key: string) {
  const value = payload[key];
  return typeof value === "string" ? value : null;
}

function renderNotificationEvent(notification: NotificationItem) {
  const payload =
    notification.payload && typeof notification.payload === "object"
      ? (notification.payload as Record<string, unknown>)
      : {};

  const challengeSlug = readString(payload, "challengeSlug");

  const challengeLink = challengeSlug ? (
    <Link className="text-indigo-300 hover:text-indigo-200" href={`/challenges/${challengeSlug}`}>
      /challenges/{challengeSlug}
    </Link>
  ) : null;

  switch (notification.type as NotificationType) {
    case "RUN_DECISION_RECORDED": {
      const decisionType = readString(payload, "decisionType") ?? "UNKNOWN";
      return (
        <>
          Run decision recorded: <span className="font-medium">{decisionType}</span>.
          {challengeLink ? <> Challenge: {challengeLink}.</> : null}
        </>
      );
    }

    case "FALLBACK_VOTE_OPENED": {
      return (
        <>
          Fallback vote opened.
          {challengeLink ? <> Challenge: {challengeLink}.</> : null}
        </>
      );
    }

    case "FALLBACK_VOTE_CLOSED": {
      const voteStatus = readString(payload, "voteStatus") ?? "UNKNOWN";
      return (
        <>
          Fallback vote closed with status <span className="font-medium">{voteStatus}</span>.
          {challengeLink ? <> Challenge: {challengeLink}.</> : null}
        </>
      );
    }

    case "VERIFIER_REQUEST_STATUS_CHANGED":
      return <>Verifier eligibility request status changed.</>;
    case "VERIFIER_POOL_MEMBERSHIP_REVOKED":
      return <>Verifier pool membership revoked.</>;
    case "CHALLENGE_JOINED_SOFT_LOCK_TRIGGERED":
      return <>Challenge soft lock triggered by participant join.</>;
    case "RUN_REVIEW_CLAIMED":
      return <>A run submission was claimed for review.</>;
    case "MEDIA_MODERATION_DECIDED":
      return <>Media moderation decision recorded.</>;
    case "CONTACT_RELAY_DELIVERY_FAILED":
      return <>A contact relay delivery failed.</>;
    default:
      return <>Notification event: {notification.type}.</>;
  }
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/notifications");
  }

  const [notifications, params] = await Promise.all([
    listNotificationsForUserFromDb(session.user.id),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 p-6">
      <header className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
        <h1 className="text-3xl font-semibold">Notifications center</h1>
        <p className="mt-2 text-sm text-slate-300">
          In-app notifications for your account. Unread: {unreadCount} / {notifications.length}.
        </p>
        <form action={markAllNotificationsReadAction} className="mt-4">
          <button
            className="rounded-md border border-slate-600 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-800"
            type="submit"
          >
            Mark all as read
          </button>
        </form>
      </header>

      {params?.updated ? (
        <p className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          Notification state updated.
        </p>
      ) : null}

      {params?.error ? (
        <p className="rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          Could not update notification state: {params.error}.
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
        {notifications.length < 1 ? (
          <p className="text-sm text-slate-300">No notifications yet.</p>
        ) : (
          <ul className="space-y-3">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`rounded-md border p-3 ${
                  notification.isRead
                    ? "border-slate-800 bg-slate-950/50"
                    : "border-indigo-500/40 bg-indigo-500/10"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm text-slate-100">
                      {renderNotificationEvent(notification)}
                    </p>
                    <p className="text-xs text-slate-400">
                      {notification.createdAt.toLocaleString()} ·{" "}
                      {notification.isRead ? "Read" : "Unread"}
                    </p>
                  </div>

                  {notification.isRead ? (
                    <form action={markNotificationUnreadAction}>
                      <input name="notificationId" type="hidden" value={notification.id} />
                      <button
                        className="rounded-md border border-slate-600 px-3 py-1 text-xs text-slate-100 hover:bg-slate-800"
                        type="submit"
                      >
                        Mark unread
                      </button>
                    </form>
                  ) : (
                    <form action={markNotificationReadAction}>
                      <input name="notificationId" type="hidden" value={notification.id} />
                      <button
                        className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                        type="submit"
                      >
                        Mark read
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
