import { Prisma } from "@prisma/client";

import type { Currency } from "@/lib/account-schemas";
import { prisma } from "@/lib/prisma";

export const ANALYTICS_PERIODS = ["1m", "3m", "6m", "1y"] as const;
export type AnalyticsPeriod = (typeof ANALYTICS_PERIODS)[number];

export function parseAnalyticsPeriod(value: unknown): AnalyticsPeriod {
  return ANALYTICS_PERIODS.includes(value as AnalyticsPeriod)
    ? (value as AnalyticsPeriod)
    : "6m";
}

/** Décalage fixe d'Antananarivo (UTC+3, pas d'heure d'été). */
const TZ_OFFSET_MS = 3 * 60 * 60 * 1000;

function tzParts(d: Date): { y: number; m: number; day: number } {
  const s = new Date(d.getTime() + TZ_OFFSET_MS);
  return { y: s.getUTCFullYear(), m: s.getUTCMonth(), day: s.getUTCDate() };
}

/** Minuit local (TZ) en instant UTC. */
function tzMidnightUTC(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m, day) - TZ_OFFSET_MS);
}

const dayLabelFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Indian/Antananarivo",
});
const monthLabelFmt = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "2-digit",
  timeZone: "Indian/Antananarivo",
});
const dayMonthNumFmt = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Indian/Antananarivo",
});

export type AnalyticsPoint = {
  key: string;
  label: string;
  income: number;
  expenses: number;
  savings: number;
};

export type AnalyticsSlice = {
  id: string;
  name: string;
  color: string;
  icon: string;
  amount: number;
  share: number;
};

export type Comparison = {
  current: number;
  previous: number;
  /** Variation relative, null si non calculable (période précédente à 0). */
  delta: number | null;
};

export type AnalyticsData = {
  currency: Currency;
  period: AnalyticsPeriod;
  periodLabel: string;
  excludedAccounts: number;
  days: number;
  points: AnalyticsPoint[];
  kpis: {
    income: number;
    expenses: number;
    savings: number;
    savingsRate: number | null;
    avgDailyExpense: number;
    topCategory: AnalyticsSlice | null;
    biggestExpense: {
      id: string;
      description: string;
      amount: number;
      date: string;
      accountName: string;
      categoryName: string | null;
    } | null;
  };
  categories: AnalyticsSlice[];
  comparison: {
    income: Comparison;
    expenses: Comparison;
    savings: Comparison;
  };
  hasData: boolean;
};

type Bucket = { key: string; label: string; start: Date; end: Date };

const PERIOD_LABELS: Record<AnalyticsPeriod, string> = {
  "1m": "ce mois-ci",
  "3m": "3 derniers mois",
  "6m": "6 derniers mois",
  "1y": "12 derniers mois",
};

/** Fenêtre courante + granularité selon la période. */
function buildWindow(
  period: AnalyticsPeriod,
  now: Date,
): { start: Date; end: Date; prevStart: Date; prevEnd: Date; buckets: Bucket[] } {
  const { y, m, day } = tzParts(now);
  const todayStart = tzMidnightUTC(y, m, day);
  const end = new Date(todayStart.getTime() + 86_400_000);

  if (period === "1m") {
    const start = tzMidnightUTC(y, m, 1);
    const n = Math.round((end.getTime() - start.getTime()) / 86_400_000);
    const buckets = Array.from({ length: n }, (_, i) => {
      const s = new Date(start.getTime() + i * 86_400_000);
      return {
        key: s.toISOString(),
        label: dayLabelFmt.format(s),
        start: s,
        end: new Date(s.getTime() + 86_400_000),
      };
    });
    // Comparaison : mois calendaire précédent complet.
    return { start, end, prevStart: tzMidnightUTC(y, m - 1, 1), prevEnd: start, buckets };
  }

  if (period === "3m") {
    // 13 tranches hebdomadaires se terminant aujourd'hui.
    const start = new Date(todayStart.getTime() - 12 * 7 * 86_400_000);
    const buckets = Array.from({ length: 13 }, (_, i) => {
      const s = new Date(start.getTime() + i * 7 * 86_400_000);
      return {
        key: s.toISOString(),
        label: dayMonthNumFmt.format(s),
        start: s,
        end: new Date(s.getTime() + 7 * 86_400_000),
      };
    });
    const duration = end.getTime() - start.getTime();
    return { start, end, prevStart: new Date(start.getTime() - duration), prevEnd: start, buckets };
  }

  const n = period === "6m" ? 6 : 12;
  const buckets: Bucket[] = Array.from({ length: n }, (_, i) => {
    const mi = m - (n - 1 - i);
    const s = tzMidnightUTC(y, mi, 1);
    return {
      key: s.toISOString(),
      label: monthLabelFmt.format(s),
      start: s,
      end: tzMidnightUTC(y, mi + 1, 1),
    };
  });
  const start = buckets[0].start;
  const duration = end.getTime() - start.getTime();
  return { start, end, prevStart: new Date(start.getTime() - duration), prevEnd: start, buckets };
}

const toNum = (d: Prisma.Decimal) => Number(d.toFixed(2));
const round2 = (n: number) => Math.round(n * 100) / 100;

function deltaOf(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / Math.abs(previous);
}

export async function getAnalyticsData(
  userId: string,
  period: AnalyticsPeriod,
  now: Date = new Date(),
): Promise<AnalyticsData | null> {
  const accounts = await prisma.account.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: "asc" },
    select: { currency: true },
  });
  if (accounts.length === 0) return null;

  const currency = (
    accounts.some((a) => a.currency === "MGA") ? "MGA" : accounts[0].currency
  ) as Currency;
  const excludedAccounts = accounts.filter((a) => a.currency !== currency).length;

  const { start, end, prevStart, prevEnd, buckets } = buildWindow(period, now);
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000));

  const rowSelect = {
    id: true,
    amount: true,
    type: true,
    date: true,
    description: true,
    categoryId: true,
    account: { select: { name: true } },
  } as const;

  const [curRows, prevRows] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: start, lt: end },
        type: { in: ["INCOME", "EXPENSE"] },
        account: { currency },
      },
      select: rowSelect,
    }),
    prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: prevStart, lt: prevEnd },
        type: { in: ["INCOME", "EXPENSE"] },
        account: { currency },
      },
      select: { amount: true, type: true },
    }),
  ]);

  const sum = (
    rows: Array<{ type: string; amount: Prisma.Decimal }>,
    type: "INCOME" | "EXPENSE",
  ) =>
    round2(
      rows.filter((r) => r.type === type).reduce((s, r) => s + toNum(r.amount), 0),
    );
  const income = sum(curRows, "INCOME");
  const expenses = sum(curRows, "EXPENSE");
  const savings = round2(income - expenses);
  const prevIncome = sum(prevRows, "INCOME");
  const prevExpenses = sum(prevRows, "EXPENSE");
  const prevSavings = round2(prevIncome - prevExpenses);

  // Évolution par tranche.
  const nets = buckets.map(() => ({ income: 0, expenses: 0 }));
  for (const row of curRows) {
    const t = row.date.getTime();
    let idx = buckets.findIndex((b) => t >= b.start.getTime() && t < b.end.getTime());
    if (idx === -1 && t >= buckets[buckets.length - 1].start.getTime()) {
      idx = buckets.length - 1;
    }
    if (idx === -1) continue;
    const amt = toNum(row.amount);
    if (row.type === "INCOME") nets[idx].income += amt;
    else nets[idx].expenses += amt;
  }
  const points: AnalyticsPoint[] = buckets.map((b, i) => ({
    key: b.key,
    label: b.label,
    income: round2(nets[i].income),
    expenses: round2(nets[i].expenses),
    savings: round2(nets[i].income - nets[i].expenses),
  }));

  // Dépenses par catégorie + plus grosse dépense.
  const byCat = new Map<string, number>();
  let biggest: (typeof curRows)[number] | null = null;
  for (const row of curRows) {
    if (row.type !== "EXPENSE") continue;
    const amt = toNum(row.amount);
    if (row.categoryId) byCat.set(row.categoryId, (byCat.get(row.categoryId) ?? 0) + amt);
    if (!biggest || amt > toNum(biggest.amount)) biggest = row;
  }
  const catIds = [...byCat.keys()];
  const cats =
    catIds.length > 0
      ? await prisma.category.findMany({
          where: { id: { in: catIds } },
          select: { id: true, name: true, color: true, icon: true },
        })
      : [];
  const catMap = new Map(cats.map((c) => [c.id, c]));
  const categories: AnalyticsSlice[] = [...byCat.entries()]
    .map(([id, amount]) => {
      const c = catMap.get(id);
      return {
        id,
        name: c?.name ?? "Sans catégorie",
        color: c?.color ?? "#64748b",
        icon: c?.icon ?? "Tag",
        amount: round2(amount),
        share: expenses > 0 ? amount / expenses : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    currency,
    period,
    periodLabel: PERIOD_LABELS[period],
    excludedAccounts,
    days,
    points,
    kpis: {
      income,
      expenses,
      savings,
      savingsRate: income > 0 ? savings / income : null,
      avgDailyExpense: round2(expenses / days),
      topCategory: categories[0] ?? null,
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
  },
    categories: categories.slice(0, 8),
    comparison: {
      income: { current: income, previous: prevIncome, delta: deltaOf(income, prevIncome) },
      expenses: { current: expenses, previous: prevExpenses, delta: deltaOf(expenses, prevExpenses) },
      savings: { current: savings, previous: prevSavings, delta: prevSavings !== 0 ? deltaOf(savings, prevSavings) : null },
    },
    hasData: curRows.length > 0 || prevRows.length > 0,
  };
}
