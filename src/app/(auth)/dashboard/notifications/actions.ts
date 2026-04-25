"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import {
  markAllNotificationsReadForUserInDb,
  markNotificationReadStateInDb,
} from "@/lib/notifications/repository";

export async function markNotificationReadAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/notifications");
  }

  const notificationId = String(formData.get("notificationId") ?? "").trim();

  if (!notificationId) {
    redirect("/dashboard/notifications?error=invalid_notification");
  }

  const result = await markNotificationReadStateInDb({
    notificationId,
    actorUserId: session.user.id,
    isRead: true,
  });

  revalidatePath("/dashboard/notifications");

  if (result.outcome === "NOT_FOUND") {
    redirect("/dashboard/notifications?error=notification_not_found");
  }

  redirect("/dashboard/notifications?updated=1");
}

export async function markNotificationUnreadAction(formData: FormData) {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/notifications");
  }

  const notificationId = String(formData.get("notificationId") ?? "").trim();

  if (!notificationId) {
    redirect("/dashboard/notifications?error=invalid_notification");
  }

  const result = await markNotificationReadStateInDb({
    notificationId,
    actorUserId: session.user.id,
    isRead: false,
  });

  revalidatePath("/dashboard/notifications");

  if (result.outcome === "NOT_FOUND") {
    redirect("/dashboard/notifications?error=notification_not_found");
  }

  redirect("/dashboard/notifications?updated=1");
}

export async function markAllNotificationsReadAction() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/sign-in?returnTo=/dashboard/notifications");
  }

  await markAllNotificationsReadForUserInDb({
    actorUserId: session.user.id,
  });

  revalidatePath("/dashboard/notifications");
  redirect("/dashboard/notifications?updated=1");
}
