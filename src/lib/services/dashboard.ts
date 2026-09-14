import { Prisma } from "@prisma/client";

import type { Currency } from "@/lib/account-schemas";
import { prisma } from "@/lib/prisma";

export const DASHBOARD_RANGES = ["7d", "30d", "3m", "6m", "1y"] as const;
export type DashboardRange = (typeof DASHBOARD_RANGES)[number];

export function parseDashboardRange(value: unknown): DashboardRange {
  return DASHBOARD_RANGES.includes(value as DashboardRange)
    ? (value as DashboardRange)
    : "30d";
}

/** Décalage fixe d'Antananarivo (UTC+3, pas d'heure d'été). */
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

function tzDayParts(d: Date): { y: number; m: number; day: number } {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** Minuit local (TZ) exprimé en instant UTC. */
function tzMidnightUTC(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m, day) - TZ_OFFSET_MS);
}

function monthBounds(now: Date): { start: Date; end: Date } {
  const { y, m } = tzDayParts(now);
  return {
    start: tzMidnightUTC(y, m, 1),
    end: tzMidnightUTC(y, m + 1, 1),
  };
}

const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Indian/Antananarivo",
});
const monthLabel = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "2-digit",
  timeZone: "Indian/Antananarivo",
});
const dayMonthNum = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Indian/Antananarivo",
});

export type EvolutionPoint = {
  key: string;
  label: string;
  income: number;
  expenses: number;
  balance: number;
};

export type CategorySlice = {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
};

export type DashboardData = {
  currency: Currency;
  /** Nombre de comptes dans d'autres devises (exclus des totaux). */
  excludedAccounts: number;
  totals: {
    balance: number;
    incomeMonth: number;
    expensesMonth: number;
    savings: number;
    /** Taux d'épargne du mois (0..1), null si aucun revenu. */
    savingsRate: number | null;
  };
  evolution: { range: DashboardRange; points: EvolutionPoint[] };
  expensesByCategory: CategorySlice[];
  topCategory: CategorySlice | null;
  biggestExpense: {
    id: string;
    description: string;
    amount: number;
    date: string;
    accountName: string;
    categoryName: string | null;
  } | null;
  latest: Array<{
    id: string;
    description: string;
    amount: number;
    type: "INCOME" | "EXPENSE" | "TRANSFER";
    date: string;
    accountName: string;
    accountCurrency: string;
    categoryName: string | null;
    categoryColor: string;
  }>;
  topAccounts: Array<{
    id: string;
    name: string;
    type: string;
    balance: string;
    currency: string;
  }>;
  hasAnyData: boolean;
};

type Bucket = { key: string; label: string; start: Date; end: Date };

function buildBuckets(range: DashboardRange, now: Date): Bucket[] {
  const { y, m, day } = tzDayParts(now);
  const todayStart = tzMidnightUTC(y, m, day);

  if (range === "7d" || range === "30d") {
    const n = range === "7d" ? 7 : 30;
    return Array.from({ length: n }, (_, i) => {
      const start = new Date(todayStart.getTime() - (n - 1 - i) * 86_400_000);
      return {
        key: start.toISOString(),
        label: dayLabel.format(start),
        start,
        end: new Date(start.getTime() + 86_400_000),
      };
    });
  }

  if (range === "3m") {
    // 13 tranches de 7 jours se terminant aujourd'hui.
    return Array.from({ length: 13 }, (_, i) => {
      const start = new Date(todayStart.getTime() - (12 - i) * 7 * 86_400_000);
      return {
        key: start.toISOString(),
        label: dayMonthNum.format(start),
        start,
        end: new Date(start.getTime() + 7 * 86_400_000),
      };
    });
  }

  const n = range === "6m" ? 6 : 12;
  return Array.from({ length: n }, (_, i) => {
    const monthIndex = m - (n - 1 - i);
    const start = tzMidnightUTC(y, monthIndex, 1);
    const end = tzMidnightUTC(y, monthIndex + 1, 1);
    return { key: start.toISOString(), label: monthLabel.format(start), start, end };
  });
}

const toNum = (d: Prisma.Decimal) => Number(d.toFixed(2));

export async function getDashboardData(
  userId: string,
  range: DashboardRange,
  now: Date = new Date(),
): Promise<DashboardData | null> {
  const accounts = await prisma.account.findMany({
    where: { userId, isArchived: false },
    orderBy: [{ balance: "desc" }, { name: "asc" }],
    select: { id: true, name: true, type: true, balance: true, currency: true },
  });
  if (accounts.length === 0) return null;

  // Devise de référence : MGA si présente, sinon celle du premier compte.
  const currency = (
    accounts.some((a) => a.currency === "MGA") ? "MGA" : accounts[0].currency
  ) as Currency;
  const excludedAccounts = accounts.filter((a) => a.currency !== currency).length;
  const scoped = accounts.filter((a) => a.currency === currency);
  const balance = scoped.reduce((sum, a) => sum + toNum(a.balance), 0);
  const savings = scoped
    .filter((a) => a.type === "SAVINGS")
    .reduce((sum, a) => sum + toNum(a.balance), 0);

  const month = monthBounds(now);
  const buckets = buildBuckets(range, now);
  const rangeStart = buckets[0].start;

  const [monthRows, rangeRows, latestRows, otherTxCount] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: month.start, lt: month.end },
        type: { in: ["INCOME", "EXPENSE"] },
        account: { currency },
      },
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        date: true,
        categoryId: true,
        account: { select: { name: true } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: rangeStart },
        type: { in: ["INCOME", "EXPENSE"] },
        account: { currency },
      },
      select: { amount: true, type: true, date: true },
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: [{ date: "desc" }, { id: "desc" }],
      take: 5,
      select: {
        id: true,
        description: true,
        amount: true,
        type: true,
        date: true,
        account: { select: { name: true, currency: true } },
        category: { select: { name: true, color: true } },
      },
    }),
    prisma.transaction.count({
      where: { userId, account: { currency: { not: currency } } },
    }),
  ]);

  let incomeMonth = 0;
  let expensesMonth = 0;
  const byCategory = new Map<string, number>();
  let biggest: (typeof monthRows)[number] | null = null;
  for (const row of monthRows) {
    const amt = toNum(row.amount);
    if (row.type === "INCOME") incomeMonth += amt;
    else {
      expensesMonth += amt;
      if (row.categoryId) {
        byCategory.set(row.categoryId, (byCategory.get(row.categoryId) ?? 0) + amt);
      }
      if (!biggest || amt > toNum(biggest.amount)) biggest = row;
    }
  }

  const categoryIds = [...byCategory.keys()];
  const categories =
    categoryIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, color: true, icon: true },
        })
      : [];
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const expensesByCategory: CategorySlice[] = [...byCategory.entries()]
    .map(([id, amount]) => {
      const c = catMap.get(id);
      return {
        id,
        name: c?.name ?? "Sans catégorie",
        color: c?.color ?? "#64748b",
        icon: c?.icon ?? "Tag",
        amount,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  // Évolution : nets par tranche + solde cumulé ancré sur le total actuel.
  const nets = buckets.map(() => ({ income: 0, expenses: 0 }));
  for (const row of rangeRows) {
    const t = row.date.getTime();
    let idx = buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
    // Transaction légèrement future (validation : J+1 max) -> dernière tranche.
    if (idx === -1 && t >= buckets[buckets.length - 1].start.getTime()) {
      idx = buckets.length - 1;
    }
    if (idx === -1) continue;
    const amt = toNum(row.amount);
    if (row.type === "INCOME") nets[idx].income += amt;
    else nets[idx].expenses += amt;
  }
  // Rattache les transactions postérieures à la dernière tranche (aujourd'hui en cours).
  const periodNet = nets.reduce((s, n) => s + n.income - n.expenses, 0);
  let running = balance - periodNet;
  const points: EvolutionPoint[] = buckets.map((b, i) => {
    running += nets[i].income - nets[i].expenses;
    return {
      key: b.key,
      label: b.label,
      income: Math.round(nets[i].income * 100) / 100,
      expenses: Math.round(nets[i].expenses * 100) / 100,
      balance: Math.round(running * 100) / 100,
    };
  });

  const netMonth = incomeMonth - expensesMonth;

  return {
    currency,
    excludedAccounts,
    totals: {
      balance: Math.round(balance * 100) / 100,
      incomeMonth: Math.round(incomeMonth * 100) / 100,
      expensesMonth: Math.round(expensesMonth * 100) / 100,
      savings: Math.round(savings * 100) / 100,
      savingsRate: incomeMonth > 0 ? netMonth / incomeMonth : null,
    },
    evolution: { range, points },
    expensesByCategory: expensesByCategory.slice(0, 6),
    topCategory: expensesByCategory[0] ?? null,
    biggestExpense: biggest
      ? {
          id: biggest.id,
          description: biggest.description,
          amount: toNum(biggest.amount),
          date: biggest.date.toISOString(),
          accountName: biggest.account.name,
          categoryName: catMap.get(biggest.categoryId as string)?.name ?? null,
        }
      : null,
    latest: latestRows.map((r) => ({
      id: r.id,
      description: r.description,
      amount: toNum(r.amount),
      type: r.type,
      date: r.date.toISOString(),
      accountName: r.account.name,
      accountCurrency: r.account.currency,
      categoryName: r.category?.name ?? null,
      categoryColor: r.category?.color ?? "#64748b",
    })),
    topAccounts: accounts.slice(0, 4).map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      balance: a.balance.toFixed(2),
      currency: a.currency,
    })),
    hasAnyData:
      monthRows.length > 0 || rangeRows.length > 0 || latestRows.length > 0 || otherTxCount > 0,
  };
}
