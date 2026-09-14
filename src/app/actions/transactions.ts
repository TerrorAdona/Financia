"use server";

import { revalidatePath } from "next/cache";

import type {
  CreateTransactionInput,
  UpdateTransactionInput,
} from "@/lib/transaction-schemas";
import { requireUserId } from "@/lib/auth-helpers";
import type {
  TransactionsResult,
  TransactionListItem,
  TransactionListResult,
} from "@/lib/services/transactions";
import {
  createTransaction as createTransactionService,
  deleteTransaction as deleteTransactionService,
  updateTransaction as updateTransactionService,
} from "@/lib/services/transactions";

function revalidateTransactionPages(): void {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
}

export async function createTransactionAction(
  input: CreateTransactionInput,
): Promise<TransactionsResult<TransactionListItem>> {
  const userId = await requireUserId();
  const result = await createTransactionService(userId, input);
  if (!result.error) revalidateTransactionPages();
  return result;
}

export async function updateTransactionAction(
  input: UpdateTransactionInput,
): Promise<TransactionsResult<TransactionListItem>> {
  const userId = await requireUserId();
  const result = await updateTransactionService(userId, input);
  if (!result.error) revalidateTransactionPages();
  return result;
}

export async function deleteTransactionAction(
  id: string,
): Promise<TransactionsResult> {
  const userId = await requireUserId();
  const result = await deleteTransactionService(userId, id);
  if (!result.error) revalidateTransactionPages();
  return result;
}

export type { TransactionListResult };
