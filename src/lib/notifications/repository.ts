import { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export type NotificationItem = {
  id: string;
  type: NotificationType;
  payload: unknown;
  isRead: boolean;
  createdAt: Date;
  readAt: Date | null;
};

export async function listNotificationsForUserFromDb(userId: string): Promise<NotificationItem[]> {
  return prisma.notification.findMany({
    where: {
      userId,
    },
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      type: true,
      payload: true,
      isRead: true,
      createdAt: true,
      readAt: true,
    },
  });
}

export async function markNotificationReadStateInDb(input: {
  notificationId: string;
  actorUserId: string;
  isRead: boolean;
}): Promise<{ outcome: "UPDATED" | "NOT_FOUND" }> {
  const result = await prisma.notification.updateMany({
    where: {
      id: input.notificationId,
      userId: input.actorUserId,
    },
    data: {
      isRead: input.isRead,
      readAt: input.isRead ? new Date() : null,
    },
  });

  return result.count > 0 ? { outcome: "UPDATED" } : { outcome: "NOT_FOUND" };
}

export async function markAllNotificationsReadForUserInDb(input: {
  actorUserId: string;
}): Promise<{ count: number }> {
  const result = await prisma.notification.updateMany({
    where: {
      userId: input.actorUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return {
    count: result.count,
  };
}
