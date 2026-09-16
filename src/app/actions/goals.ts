"use server";

import { revalidatePath } from "next/cache";

import type {
  ContributeGoalInput,
  CreateGoalInput,
  UpdateGoalInput,
} from "@/lib/goal-schemas";
import { requireUserId } from "@/lib/auth-helpers";
import type { GoalsResult, GoalDTO } from "@/lib/services/goals";
import {
  contributeToGoal as contributeToGoalService,
  createGoal as createGoalService,
  deleteGoal as deleteGoalService,
  updateGoal as updateGoalService,
} from "@/lib/services/goals";

function revalidateGoalPages(): void {
  revalidatePath("/goals");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function createGoalAction(
  input: CreateGoalInput,
): Promise<GoalsResult<GoalDTO>> {
  const userId = await requireUserId();
  const result = await createGoalService(userId, input);
  if (!result.error) revalidateGoalPages();
  return result;
}

export async function updateGoalAction(
  input: UpdateGoalInput,
): Promise<GoalsResult<GoalDTO>> {
  const userId = await requireUserId();
  const result = await updateGoalService(userId, input);
  if (!result.error) revalidateGoalPages();
  return result;
}

export async function deleteGoalAction(id: string): Promise<GoalsResult> {
  const userId = await requireUserId();
  const result = await deleteGoalService(userId, id);
  if (!result.error) revalidateGoalPages();
  return result;
}

export async function contributeGoalAction(
  input: ContributeGoalInput,
): Promise<GoalsResult<GoalDTO>> {
  const userId = await requireUserId();
  const result = await contributeToGoalService(userId, input);
  if (!result.error) revalidateGoalPages();
  return result;
}
