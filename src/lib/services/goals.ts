import { Prisma } from "@prisma/client";

import {
  contributeGoalSchema,
  createGoalSchema,
  updateGoalSchema,
  type ContributeGoalInput,
  type CreateGoalInput,
  type UpdateGoalInput,
} from "@/lib/goal-schemas";
import { formatMoney } from "@/lib/money";
import { maybeNotifyGoalNear } from "@/lib/services/notifications";
import { getPrimaryCurrency } from "@/lib/services/accounts";
import { prisma } from "@/lib/prisma";
import { firstIssue } from "@/lib/validation";

export type GoalStatus = "ACTIVE" | "COMPLETED" | "OVERDUE" | "EXCEEDED";

export type GoalDTO = {
  id: string;
  name: string;
  description: string | null;
  targetAmount: string;
  currentAmount: string;
  deadline: string;
  percent: number;
  remaining: number;
  status: GoalStatus;
  daysLeft: number | null;
};

export type GoalsResult<T = undefined> = {
  data?: T;
  error?: string;
};

const toNum = (d: Prisma.Decimal) => Number(d.toFixed(2));

function computeDTO(row: {
  id: string;
  name: string;
  description: string | null;
  targetAmount: Prisma.Decimal;
  currentAmount: Prisma.Decimal;
  deadline: Date | null;
  now?: Date;
}): GoalDTO {
  const target = toNum(row.targetAmount);
  const current = toNum(row.currentAmount);
  const percent = target > 0 ? Math.round((current / target) * 1000) / 10 : 0;
  const remaining = Math.round((target - current) * 100) / 100;
  // Comparaison en jours calendaires (fuseau applicatif UTC+3 fixe).
  const now = row.now ?? new Date();
  const shifted = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const todayStart =
    Date.UTC(
      shifted.getUTCFullYear(),
      shifted.getUTCMonth(),
      shifted.getUTCDate(),
    ) -
    3 * 60 * 60 * 1000;
  const overdue =
    !!row.deadline && row.deadline.getTime() < todayStart && current < target;
  const daysLeft = row.deadline
    ? Math.round((row.deadline.getTime() - todayStart) / 86_400_000)
    : null;
  const status: GoalStatus =
    current >= target && target > 0
      ? current > target
        ? "EXCEEDED"
        : "COMPLETED"
      : overdue
        ? "OVERDUE"
        : "ACTIVE";
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    targetAmount: row.targetAmount.toFixed(2),
    currentAmount: row.currentAmount.toFixed(2),
    deadline: row.deadline ? row.deadline.toISOString() : "",
    percent,
    remaining,
    status,
    daysLeft,
  };
}

export async function listGoals(userId: string): Promise<GoalsResult<GoalDTO[]>> {
  const goals = await prisma.savingsGoal.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { deadline: "asc" }, { createdAt: "asc" }],
  });
  return {
    data: goals.map((g) =>
      computeDTO({ ...g }),
    ),
  };
}

export async function createGoal(
  userId: string,
  input: CreateGoalInput,
): Promise<GoalsResult<GoalDTO>> {
  const parsed = createGoalSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const created = await prisma.savingsGoal.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      targetAmount: new Prisma.Decimal(parsed.data.targetAmount.toFixed(2)),
      currentAmount: new Prisma.Decimal((parsed.data.currentAmount ?? 0).toFixed(2)),
      deadline: parsed.data.deadline,
      status: "ACTIVE",
      userId,
    },
  });
  // Un objectif créé déjà atteint (épargne initiale >= cible) notifie aussitôt.
  if (toNum(created.currentAmount) >= toNum(created.targetAmount)) {
    await markCompleted(userId, created.id);
    const done = await prisma.savingsGoal.findUniqueOrThrow({
      where: { id: created.id },
    });
    return { data: computeDTO({ ...done }) };
  }
  // Objectif proche du but (≥ 80 %) : notification « proche » (une seule fois).
  const currency = (await getPrimaryCurrency(prisma, userId)) ?? "MGA";
  await maybeNotifyGoalNear(
    userId,
    created.name,
    toNum(created.currentAmount),
    toNum(created.targetAmount),
    currency,
  );
  return { data: computeDTO({ ...created }) };
}

export async function updateGoal(
  userId: string,
  input: UpdateGoalInput,
): Promise<GoalsResult<GoalDTO>> {
  const parsed = updateGoalSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const existing = await prisma.savingsGoal.findFirst({
    where: { id: parsed.data.id, userId },
  });
  if (!existing) return { error: "Objectif introuvable." };

  const wasCompleted = existing.status === "COMPLETED";
  const updated = await prisma.savingsGoal.update({
    where: { id: existing.id },
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
      targetAmount: new Prisma.Decimal(parsed.data.targetAmount.toFixed(2)),
      currentAmount: new Prisma.Decimal(parsed.data.currentAmount.toFixed(2)),
      deadline: parsed.data.deadline,
      status:
        toNum(new Prisma.Decimal(parsed.data.currentAmount.toFixed(2))) >=
        toNum(new Prisma.Decimal(parsed.data.targetAmount.toFixed(2)))
          ? "COMPLETED"
          : "ACTIVE",
    },
  });
  if (updated.status === "COMPLETED" && !wasCompleted) {
    await markCompleted(userId, updated.id);
  } else if (updated.status !== "COMPLETED") {
    const currency = (await getPrimaryCurrency(prisma, userId)) ?? "MGA";
    await maybeNotifyGoalNear(
      userId,
      updated.name,
      toNum(updated.currentAmount),
      toNum(updated.targetAmount),
      currency,
    );
  }
  const fresh = await prisma.savingsGoal.findUniqueOrThrow({
    where: { id: updated.id },
  });
  return { data: computeDTO({ ...fresh }) };
}

export async function deleteGoal(
  userId: string,
  id: string,
): Promise<GoalsResult> {
  const existing = await prisma.savingsGoal.findFirst({
    where: { id, userId },
    select: { id: true },
  });
  if (!existing) return { error: "Objectif introuvable." };
  await prisma.savingsGoal.delete({ where: { id: existing.id } });
  return { data: undefined };
}

/**
 * Ajoute une contribution : met à jour le montant, recalcule, notifie si
 * l'objectif vient d'être atteint (transition, pas de doublon).
 */
export async function contributeToGoal(
  userId: string,
  input: ContributeGoalInput,
): Promise<GoalsResult<GoalDTO>> {
  const parsed = contributeGoalSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const existing = await prisma.savingsGoal.findFirst({
    where: { id: parsed.data.id, userId },
  });
  if (!existing) return { error: "Objectif introuvable." };

  const updated = await prisma.savingsGoal.update({
    where: { id: existing.id },
    data: {
      currentAmount: existing.currentAmount.add(
        new Prisma.Decimal(parsed.data.amount.toFixed(2)),
      ),
      status:
        toNum(
          existing.currentAmount.add(
            new Prisma.Decimal(parsed.data.amount.toFixed(2)),
          ),
        ) >= toNum(existing.targetAmount)
          ? "COMPLETED"
          : "ACTIVE",
    },
  });

  if (updated.status === "COMPLETED" && existing.status !== "COMPLETED") {
    await markCompleted(userId, updated.id);
  } else if (updated.status !== "COMPLETED") {
    const currency = (await getPrimaryCurrency(prisma, userId)) ?? "MGA";
    await maybeNotifyGoalNear(
      userId,
      updated.name,
      toNum(updated.currentAmount),
      toNum(updated.targetAmount),
      currency,
    );
  }
  const fresh = await prisma.savingsGoal.findUniqueOrThrow({
    where: { id: updated.id },
  });
  return { data: computeDTO({ ...fresh }) };
}

async function markCompleted(userId: string, goalId: string): Promise<void> {
  const goal = await prisma.savingsGoal.findUniqueOrThrow({
    where: { id: goalId },
  });
  const currency = (await getPrimaryCurrency(prisma, userId)) ?? "MGA";
  const target = toNum(goal.targetAmount);
  const current = toNum(goal.currentAmount);
  const over = current - target;
  await prisma.notification.create({
    data: {
      title: `Objectif « ${goal.name} » atteint !`,
      message:
        over > 0
          ? `${formatMoney(current, currency)} épargnés sur ${formatMoney(target, currency)} (dépassé de ${formatMoney(over, currency)}). Bravo !`
          : `${formatMoney(current, currency)} épargnés sur ${formatMoney(target, currency)}. Bravo !`,
      type: "GOAL_UPDATE",
      userId,
    },
  });
}
