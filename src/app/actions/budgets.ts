"use server";

import { revalidatePath } from "next/cache";

import type { CreateBudgetInput, UpdateBudgetInput } from "@/lib/budget-schemas";
import { requireUserId } from "@/lib/auth-helpers";
import type { BudgetsResult, BudgetDTO } from "@/lib/services/budgets";
import {
  createBudget as createBudgetService,
  deleteBudget as deleteBudgetService,
  updateBudget as updateBudgetService,
} from "@/lib/services/budgets";

function revalidateBudgetPages(): void {
  revalidatePath("/budgets");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function createBudgetAction(
  input: CreateBudgetInput,
): Promise<BudgetsResult<BudgetDTO>> {
  const userId = await requireUserId();
  const result = await createBudgetService(userId, input);
  if (!result.error) revalidateBudgetPages();
  return result;
}

export async function updateBudgetAction(
  input: UpdateBudgetInput,
): Promise<BudgetsResult<BudgetDTO>> {
  const userId = await requireUserId();
  const result = await updateBudgetService(userId, input);
  if (!result.error) revalidateBudgetPages();
  return result;
}

export async function deleteBudgetAction(id: string): Promise<BudgetsResult> {
  const userId = await requireUserId();
  const result = await deleteBudgetService(userId, id);
  if (!result.error) revalidateBudgetPages();
  return result;
}
