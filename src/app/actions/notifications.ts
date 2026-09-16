"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import type {
  NotificationDTO,
  NotificationsResult,
} from "@/lib/services/notifications";
import {
  deleteNotification as deleteNotificationService,
  markAllNotificationsAsRead as markAllService,
  markNotificationAsRead as markAsReadService,
} from "@/lib/services/notifications";

function revalidateNotificationPages(): void {
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markNotificationAsReadAction(
  id: string,
): Promise<NotificationsResult<NotificationDTO>> {
  const userId = await requireUserId();
  const result = await markAsReadService(userId, id);
  if (!result.error) revalidateNotificationPages();
  return result;
}

export async function markAllNotificationsAsReadAction(): Promise<
  NotificationsResult<{ count: number }>
> {
  const userId = await requireUserId();
  const result = await markAllService(userId);
  if (!result.error) revalidateNotificationPages();
  return result;
}

export async function deleteNotificationAction(
  id: string,
): Promise<NotificationsResult> {
  const userId = await requireUserId();
  const result = await deleteNotificationService(userId, id);
  if (!result.error) revalidateNotificationPages();
  return result;
}
