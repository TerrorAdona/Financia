"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import type { CreateTransferInput } from "@/lib/transfer-schemas";
import type {
  TransactionListItem,
  TransactionsResult,
} from "@/lib/services/transactions";
import { createTransfer as createTransferService } from "@/lib/services/transfers";

function revalidateTransferPages(): void {
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/notifications");
}

export async function createTransferAction(
  input: CreateTransferInput,
): Promise<TransactionsResult<TransactionListItem>> {
  const userId = await requireUserId();
  const result = await createTransferService(userId, input);
  if (!result.error) revalidateTransferPages();
  return result;
}
