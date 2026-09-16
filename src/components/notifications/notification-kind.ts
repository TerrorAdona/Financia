import {
  AlarmClock,
  Bell,
  CircleAlert,
  CircleDollarSign,
  PiggyBank,
  Target,
  TriangleAlert,
  Trophy,
  type LucideIcon,
} from "lucide-react";

import type { NotificationDTO } from "@/lib/services/notifications";

export type NotificationKindKey =
  | "budget-50"
  | "budget-75"
  | "budget-90"
  | "budget-exceeded"
  | "goal-reached"
  | "goal-near"
  | "large-transaction"
  | "reminder"
  | "info";

export type NotificationKind = {
  key: NotificationKindKey;
  label: string;
  icon: LucideIcon;
  badge: string;
  iconWrap: string;
};

/**
 * Les 7 cas métier demandés + replis (info / rappel).
 * La détection se fait sur (type, titre) car le schéma Prisma ne porte
 * que 4 NotificationType génériques.
 */
export function getNotificationKind(n: NotificationDTO): NotificationKind {
  if (n.type === "BUDGET_ALERT") {
    if (n.title.includes("dépassé"))
      return {
        key: "budget-exceeded",
        label: "Budget dépassé",
        icon: CircleAlert,
        badge: "bg-destructive/10 text-destructive",
        iconWrap: "bg-destructive/10",
      };
    if (n.title.includes("90 %"))
      return {
        key: "budget-90",
        label: "Budget à 90 %",
        icon: TriangleAlert,
        badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
        iconWrap: "bg-orange-500/10",
      };
    if (n.title.includes("75 %"))
      return {
        key: "budget-75",
        label: "Budget à 75 %",
        icon: PiggyBank,
        badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
        iconWrap: "bg-amber-500/10",
      };
    if (n.title.includes("50 %"))
      return {
        key: "budget-50",
        label: "Budget à 50 %",
        icon: PiggyBank,
        badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
        iconWrap: "bg-sky-500/10",
      };
    return {
      key: "budget-50",
      label: "Budget",
      icon: PiggyBank,
      badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
      iconWrap: "bg-sky-500/10",
    };
  }

  if (n.type === "GOAL_UPDATE") {
    if (n.title.includes("proche"))
      return {
        key: "goal-near",
        label: "Objectif proche",
        icon: Target,
        badge: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
        iconWrap: "bg-sky-500/10",
      };
    return {
      key: "goal-reached",
      label: "Objectif atteint",
      icon: Trophy,
      badge:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      iconWrap: "bg-emerald-500/10",
    };
  }

  if (n.type === "REMINDER")
    return {
      key: "reminder",
      label: "Rappel",
      icon: AlarmClock,
      badge: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
      iconWrap: "bg-violet-500/10",
    };

  if (n.title.startsWith("Transaction importante"))
    return {
      key: "large-transaction",
      label: "Transaction importante",
      icon: CircleDollarSign,
      badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
      iconWrap: "bg-amber-500/10",
    };

  return {
    key: "info",
    label: "Information",
    icon: Bell,
    badge: "bg-muted text-muted-foreground",
    iconWrap: "bg-muted",
  };
}

const dateTimeFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Indian/Antananarivo",
});

/** "2026-09-14T..." -> "14 sept. 2026 à 10:24". */
export function formatNotificationDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return dateTimeFmt.format(d).replace(",", " à");
}
