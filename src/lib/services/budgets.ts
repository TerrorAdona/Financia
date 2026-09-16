import { Prisma } from "@prisma/client";

import type { Currency } from "@/lib/account-schemas";
import {
  BUDGET_THRESHOLDS,
  createBudgetSchema,
  currentMonth,
  monthLabel,
  monthToRange,
  updateBudgetSchema,
  type BudgetThreshold,
  type CreateBudgetInput,
  type UpdateBudgetInput,
} from "@/lib/budget-schemas";
import { formatMoney } from "@/lib/money";
import { budgetAlertTitle } from "@/lib/services/notifications";
import { getPrimaryCurrency } from "@/lib/services/accounts";
import { prisma } from "@/lib/prisma";
import { firstIssue } from "@/lib/validation";

export type BudgetStatus = "ok" | "watch" | "warning" | "alert" | "exceeded";

export type BudgetDTO = {
  id: string;
  name: string;
  amountLimit: string;
  month: string;
  monthLabel: string;
  category: { id: string; name: string; color: string; icon: string };
  spent: number;
  remaining: number;
  percent: number;
  status: BudgetStatus;
  lastNotifiedThreshold: number;
};

export type BudgetsResult<T = undefined> = {
  data?: T;
  error?: string;
};

const toNum = (d: Prisma.Decimal) => Number(d.toFixed(2));

function statusFor(percent: number): BudgetStatus {
  if (percent > 100) return "exceeded";
  if (percent >= 90) return "alert";
  if (percent >= 75) return "warning";
  if (percent >= 50) return "watch";
  return "ok";
}

type BudgetRow = {
  id: string;
  name: string;
  amountLimit: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
  categoryId: string | null;
  lastNotifiedThreshold: number;
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
};

function computeDTO(
  row: BudgetRow,
  spentByCategory: Map<string, number>,
): BudgetDTO | null {
  if (!row.categoryId || !row.category) return null;
  const limit = toNum(row.amountLimit);
  const spent = Math.round((spentByCategory.get(row.categoryId) ?? 0) * 100) / 100;
  const remaining = Math.round((limit - spent) * 100) / 100;
  const percent = limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0;
  const month = `${row.startDate.getUTCFullYear()}-${String(row.startDate.getUTCMonth() + 1).padStart(2, "0")}`;
  return {
    id: row.id,
    name: row.name,
    amountLimit: row.amountLimit.toFixed(2),
    month,
    monthLabel: monthLabel(month),
    category: {
      id: row.category.id,
      name: row.category.name,
      color: row.category.color ?? "#64748b",
      icon: row.category.icon ?? "Tag",
    },
    spent,
    remaining,
    percent,
    status: statusFor(percent),
    lastNotifiedThreshold: row.lastNotifiedThreshold,
  };
}

const budgetInclude = {
  category: { select: { id: true, name: true, color: true, icon: true } },
} as const;

/**
 * Sommes dépensées par catégorie sur une fenêtre, en devise de référence.
 * Une seule requête pour tous les budgets concernés.
 */
async function sumSpentByCategory(
  tx: Prisma.TransactionClient,
  userId: string,
  currency: Currency,
  categoryIds: string[],
  from: Date,
  to: Date,
): Promise<Map<string, number>> {
  if (categoryIds.length === 0) return new Map();
  const rows = await tx.transaction.findMany({
    where: {
      userId,
      type: "EXPENSE",
      categoryId: { in: categoryIds },
      date: { gte: from, lt: to },
      account: { currency },
    },
    select: { amount: true, categoryId: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.categoryId) continue;
    map.set(row.categoryId, (map.get(row.categoryId) ?? 0) + toNum(row.amount));
  }
  return map;
}

/**
 * Recalcule les seuils de tous les budgets de l'utilisateur et crée une
 * notification par seuil nouvellement atteint (50/75/90/100).
 * Idempotent : aucun doublon si le niveau n'a pas changé.
 */
export async function refreshBudgetAlerts(userId: string): Promise<void> {
  const budgets = await prisma.budget.findMany({
    where: { userId, categoryId: { not: null } },
    select: {
      id: true,
      name: true,
      amountLimit: true,
      startDate: true,
      endDate: true,
      categoryId: true,
      lastNotifiedThreshold: true,
    },
  });
  if (budgets.length === 0) return;

  const currency = await getPrimaryCurrency(prisma, userId);
  if (!currency) return;

  const from = new Date(
    Math.min(...budgets.map((b) => b.startDate.getTime())),
  );
  const to = new Date(Math.max(...budgets.map((b) => b.endDate.getTime())));
  const categoryIds = [...new Set(budgets.map((b) => b.categoryId as string))];
  const spent = await sumSpentByCategory(prisma, userId, currency, categoryIds, from, to);

  for (const budget of budgets) {
    const limit = toNum(budget.amountLimit);
    const spentAmt = spent.get(budget.categoryId as string) ?? 0;
    const percent = limit > 0 ? (spentAmt / limit) * 100 : 0;
    const level = BUDGET_THRESHOLDS.filter((t) => percent >= t).pop() ?? 0;

    if (level > budget.lastNotifiedThreshold) {
      const crossed = BUDGET_THRESHOLDS.filter(
        (t) => t > budget.lastNotifiedThreshold && t <= level,
      );
      await prisma.$transaction([
        ...crossed.map((t) =>
          prisma.notification.create({
            data: {
              title: budgetAlertTitle(budget.name, t),
              message:
                t >= 100
                  ? `${formatMoney(spentAmt, currency)} dépensés sur ${formatMoney(limit, currency)} (${percent.toFixed(1).replace(".", ",")} %). Budget dépassé !`
                  : `${formatMoney(spentAmt, currency)} dépensés sur ${formatMoney(limit, currency)} (${percent.toFixed(1).replace(".", ",")} %).`,
              type: "BUDGET_ALERT",
              userId,
            },
          }),
        ),
        prisma.budget.update({
          where: { id: budget.id },
          data: { lastNotifiedThreshold: level },
        }),
      ]);
    } else if (level < budget.lastNotifiedThreshold) {
      // Dépenses revues à la baisse : on réarme pour une future remontée.
      await prisma.budget.update({
        where: { id: budget.id },
        data: { lastNotifiedThreshold: level },
      });
    }
  }
}

/** Liste les budgets démarrant sur le mois donné, avec calculs. */
export async function listBudgets(
  userId: string,
  month: string = currentMonth(),
): Promise<
  BudgetsResult<{
    budgets: BudgetDTO[];
    month: string;
    monthLabel: string;
    currency: Currency;
  }>
> {
  const { start, end } = monthToRange(month);
  const [budgets, currency] = await Promise.all([
    prisma.budget.findMany({
      where: { userId, startDate: { gte: start, lt: end } },
      orderBy: { createdAt: "asc" },
      include: budgetInclude,
    }),
    getPrimaryCurrency(prisma, userId),
  ]);
  // Sans compte, aucun calcul fiable : devise de repli pour l'affichage.
  const cur: Currency = currency ?? "MGA";
  if (!currency) {
    return { data: { budgets: [], month, monthLabel: monthLabel(month), currency: cur } };
  }

  const spent = await sumSpentByCategory(
    prisma,
    userId,
    currency,
    budgets.map((b) => b.categoryId).filter((c): c is string => !!c),
    start,
    end,
  );
  const dtos = budgets
    .map((b) => computeDTO(b, spent))
    .filter((d): d is BudgetDTO => d !== null);
  return { data: { budgets: dtos, month, monthLabel: monthLabel(month), currency: cur } };
}

export async function createBudget(
  userId: string,
  input: CreateBudgetInput,
): Promise<BudgetsResult<BudgetDTO>> {
  const parsed = createBudgetSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const { start, end } = monthToRange(parsed.data.month);

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId, type: "EXPENSE" },
    select: { id: true, name: true },
  });
  if (!category) return { error: "Catégorie de dépense introuvable." };

  const created = await prisma.budget.create({
    data: {
      name: parsed.data.name,
      amountLimit: new Prisma.Decimal(parsed.data.amountLimit.toFixed(2)),
      period: "MONTHLY",
      startDate: start,
      endDate: end,
      userId,
      categoryId: category.id,
    },
    include: budgetInclude,
  });

  await refreshBudgetAlerts(userId);

  const currency = await getPrimaryCurrency(prisma, userId);
  const dto = currency
    ? computeDTO(
        created,
        await sumSpentByCategory(prisma, userId, currency, [category.id], start, end),
      )
    : null;
  if (!dto) return { error: "Budget introuvable." };
  return { data: dto };
}

export async function updateBudget(
  userId: string,
  input: UpdateBudgetInput,
): Promise<BudgetsResult<BudgetDTO>> {
  const parsed = updateBudgetSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const existing = await prisma.budget.findFirst({
    where: { id: parsed.data.id, userId },
  });
  if (!existing) return { error: "Budget introuvable." };

  const category = await prisma.category.findFirst({
    where: { id: parsed.data.categoryId, userId, type: "EXPENSE" },
    select: { id: true },
  });
  if (!category) return { error: "Catégorie de dépense introuvable." };

  const { start, end } = monthToRange(parsed.data.month);
  const updated = await prisma.budget.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      amountLimit: new Prisma.Decimal(parsed.data.amountLimit.toFixed(2)),
      startDate: start,
      endDate: end,
      categoryId: category.id,
    },
    include: budgetInclude,
  });

  await refreshBudgetAlerts(userId);

  const currency = await getPrimaryCurrency(prisma, userId);
  const dto = currency
    ? computeDTO(
        updated,
        await sumSpentByCategory(prisma, userId, currency, [category.id], start, end),
      )
    : null;
  if (!dto) return { error: "Budget introuvable." };
  return { data: dto };
}

export async function deleteBudget(
  userId: string,
  id: string,
): Promise<BudgetsResult> {
  const existing = await prisma.budget.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return { error: "Budget introuvable." };
  // L'historique des notifications est conservé.
  await prisma.budget.delete({ where: { id: existing.id } });
  return { data: undefined };
}

export type { BudgetThreshold };
