import type { NotificationType } from "@prisma/client";

import type { Currency } from "@/lib/account-schemas";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export type NotificationDTO = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type NotificationsResult<T = undefined> = {
  data?: T;
  error?: string;
};

/**
 * Les 7 cas métier couverts par le système :
 * - budget 50 % / 75 % / 90 % (BUDGET_ALERT)
 * - budget dépassé ≥ 100 % (BUDGET_ALERT)
 * - objectif atteint ≥ 100 % (GOAL_UPDATE)
 * - objectif proche ≥ 80 % et < 100 % (GOAL_UPDATE)
 * - transaction importante (INFO)
 */
export const GOAL_NEAR_THRESHOLD = 80;

/** Seuil « transaction importante » par devise (montant >= seuil). */
export const LARGE_TRANSACTION_THRESHOLDS: Record<Currency, number> = {
  MGA: 500_000,
  EUR: 500,
  USD: 500,
};

export function isLargeTransaction(amount: number, currency: string): boolean {
  const threshold =
    LARGE_TRANSACTION_THRESHOLDS[currency as Currency] ??
    LARGE_TRANSACTION_THRESHOLDS.MGA;
  return amount >= threshold;
}

function toDTO(row: {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}): NotificationDTO {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    type: row.type,
    isRead: row.isRead,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Liste paginée simple : les plus récentes d'abord (limite 100). */
export async function listNotifications(
  userId: string,
): Promise<
  NotificationsResult<{ notifications: NotificationDTO[]; unreadCount: number }>
> {
  const [rows, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { data: { notifications: rows.map(toDTO), unreadCount } };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markNotificationAsRead(
  userId: string,
  id: string,
): Promise<NotificationsResult<NotificationDTO>> {
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
  });
  if (!existing) return { error: "Notification introuvable." };
  if (existing.isRead) return { data: toDTO(existing) };
  const updated = await prisma.notification.update({
    where: { id: existing.id },
    data: { isRead: true, readAt: new Date() },
  });
  return { data: toDTO(updated) };
}

export async function markAllNotificationsAsRead(
  userId: string,
): Promise<NotificationsResult<{ count: number }>> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
  return { data: { count: result.count } };
}

export async function deleteNotification(
  userId: string,
  id: string,
): Promise<NotificationsResult> {
  const existing = await prisma.notification.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return { error: "Notification introuvable." };
  await prisma.notification.delete({ where: { id: existing.id } });
  return { data: undefined };
}

/* ------------------------------------------------------------------ */
/* Helpers de création (appelés depuis budgets / goals / transactions) */
/* ------------------------------------------------------------------ */

export function budgetAlertTitle(budgetName: string, threshold: number): string {
  if (threshold >= 100) return `Budget « ${budgetName} » dépassé`;
  return `Budget « ${budgetName} » : seuil ${threshold} % atteint`;
}

export function goalReachedTitle(goalName: string): string {
  return `Objectif « ${goalName} » atteint !`;
}

export function goalNearTitle(goalName: string): string {
  return `Objectif « ${goalName} » proche du but`;
}

export function largeTransactionTitle(description: string): string {
  const short =
    description.length > 50 ? `${description.slice(0, 50)}…` : description;
  return `Transaction importante : ${short}`;
}

/* Titres des notifications de transfert inter-utilisateurs (type INFO).
 * Les préfixes « Transfert reçu / accepté / refusé / annulé » servent
 * aussi à la détection du kind d'affichage (notification-kind.ts). */
export function transferReceivedTitle(senderName: string): string {
  return `Transfert reçu de ${senderName}`;
}

export function transferAcceptedTitle(recipientName: string): string {
  return `Transfert accepté par ${recipientName}`;
}

export function transferRejectedTitle(recipientName: string): string {
  return `Transfert refusé par ${recipientName}`;
}

export function transferCancelledTitle(senderName: string): string {
  return `Transfert annulé par ${senderName}`;
}

/**
 * Objectif proche (≥ 80 %, < 100 %) : crée une seule notification par
 * objectif (pas de doublon tant qu'elle existe, lue ou non).
 * La suppression manuelle réarme une future notification.
 */
export async function maybeNotifyGoalNear(
  userId: string,
  goalName: string,
  current: number,
  target: number,
  currency: Currency,
): Promise<void> {
  if (!(target > 0)) return;
  const percent = (current / target) * 100;
  if (percent < GOAL_NEAR_THRESHOLD || percent >= 100) return;
  const title = goalNearTitle(goalName);
  const existing = await prisma.notification.findFirst({
    where: { userId, type: "GOAL_UPDATE", title },
    select: { id: true },
  });
  if (existing) return;
  await prisma.notification.create({
    data: {
      title,
      message: `${formatMoney(current, currency)} épargnés sur ${formatMoney(target, currency)} (${percent.toFixed(1).replace(".", ",")} %). Plus que ${formatMoney(target - current, currency)} !`,
      type: "GOAL_UPDATE",
      userId,
    },
  });
}

export async function notifyLargeTransaction(
  userId: string,
  input: {
    description: string;
    amount: number;
    currency: string;
    type: string;
  },
): Promise<void> {
  if (!isLargeTransaction(input.amount, input.currency)) return;
  const currency = (["MGA", "EUR", "USD"] as const).includes(
    input.currency as Currency,
  )
    ? (input.currency as Currency)
    : "MGA";
  const kindLabel =
    input.type === "INCOME"
      ? "Revenu"
      : input.type === "EXPENSE"
        ? "Dépense"
        : "Transfert";
  await prisma.notification.create({
    data: {
      title: largeTransactionTitle(input.description),
      message: `${kindLabel} de ${formatMoney(input.amount, currency)} — « ${input.description} ».`,
      type: "INFO",
      userId,
    },
  });
}
