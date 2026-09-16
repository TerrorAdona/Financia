"use server";

import { revalidatePath } from "next/cache";

import { requireUserId } from "@/lib/auth-helpers";
import type {
  CreateTransferInput,
  RequestTransferInput,
  TransferDecisionInput,
} from "@/lib/transfer-schemas";
import type {
  TransactionListItem,
  TransactionsResult,
} from "@/lib/services/transactions";
import {
  acceptTransferRequest as acceptService,
  cancelTransferRequest as cancelService,
  createTransfer as createTransferService,
  listRecipientAccounts as listRecipientAccountsService,
  rejectTransferRequest as rejectService,
  requestTransfer as requestService,
  searchRecipients as searchRecipientsService,
  type RecipientAccountOption,
  type RecipientOption,
  type TransferRequestDTO,
} from "@/lib/services/transfers";

function revalidateTransferPages(): void {
  revalidatePath("/transactions");
  revalidatePath("/transfers");
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

/** Demande de transfert vers un autre utilisateur (PENDING + notification). */
export async function requestTransferAction(
  input: RequestTransferInput,
): Promise<TransactionsResult<TransferRequestDTO>> {
  const userId = await requireUserId();
  const result = await requestService(userId, input);
  if (!result.error) revalidateTransferPages();
  return result;
}

/** Confirmation du transfert par le destinataire (exécution atomique). */
export async function acceptTransferAction(
  input: TransferDecisionInput,
): Promise<TransactionsResult<TransferRequestDTO>> {
  const userId = await requireUserId();
  const result = await acceptService(userId, input);
  if (!result.error) revalidateTransferPages();
  return result;
}

/** Refus du transfert par le destinataire (aucun mouvement). */
export async function rejectTransferAction(
  input: TransferDecisionInput,
): Promise<TransactionsResult<TransferRequestDTO>> {
  const userId = await requireUserId();
  const result = await rejectService(userId, input);
  if (!result.error) revalidateTransferPages();
  return result;
}

/** Annulation de la demande par l'expéditeur (tant que PENDING). */
export async function cancelTransferAction(
  input: TransferDecisionInput,
): Promise<TransactionsResult<TransferRequestDTO>> {
  const userId = await requireUserId();
  const result = await cancelService(userId, input);
  if (!result.error) revalidateTransferPages();
  return result;
}

/** Recherche d'un destinataire par nom ou email. */
export async function searchRecipientsAction(
  query: string,
): Promise<TransactionsResult<RecipientOption[]>> {
  const userId = await requireUserId();
  return searchRecipientsService(userId, query);
}

/** Comptes actifs d'un destinataire (nom + devise, sans solde). */
export async function listRecipientAccountsAction(
  recipientId: string,
): Promise<TransactionsResult<RecipientAccountOption[]>> {
  const userId = await requireUserId();
  return listRecipientAccountsService(userId, recipientId);
}
