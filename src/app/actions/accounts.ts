"use server";

import { revalidatePath } from "next/cache";

import type {
  CreateAccountInput,
  UpdateAccountInput,
} from "@/lib/account-schemas";
import { requireUserId } from "@/lib/auth-helpers";
import type { AccountsResult, AccountDTO } from "@/lib/services/accounts";
import {
  createAccount as createAccountService,
  deleteAccount as deleteAccountService,
  updateAccount as updateAccountService,
} from "@/lib/services/accounts";

export async function createAccountAction(
  input: CreateAccountInput,
): Promise<AccountsResult<AccountDTO>> {
  const userId = await requireUserId();
  const result = await createAccountService(userId, input);
  if (!result.error) revalidatePath("/accounts");
  return result;
}

export async function updateAccountAction(
  input: UpdateAccountInput,
): Promise<AccountsResult<AccountDTO>> {
  const userId = await requireUserId();
  const result = await updateAccountService(userId, input);
  if (!result.error) revalidatePath("/accounts");
  return result;
}

export async function deleteAccountAction(
  id: string,
): Promise<AccountsResult> {
  const userId = await requireUserId();
  const result = await deleteAccountService(userId, id);
  if (!result.error) revalidatePath("/accounts");
  return result;
}
