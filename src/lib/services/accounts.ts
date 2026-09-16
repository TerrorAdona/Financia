import { Prisma, type AccountType } from "@prisma/client";

import type { Currency } from "@/lib/account-schemas";
import {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@/lib/account-schemas";
import { prisma } from "@/lib/prisma";
import { firstIssue } from "@/lib/validation";

export type AccountDTO = {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  /** Montant exact sous forme de chaîne (pas d'arrondi flottant). */
  balance: string;
  transactionCount: number;
};

export type AccountsResult<T = undefined> = {
  data?: T;
  error?: string;
};

type AccountCounts = {
  transactions: number;
  transfersIn: number;
  outgoingTransferRequests: number;
  incomingTransferRequests: number;
};

function toDTO(account: {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: Prisma.Decimal;
  _count?: AccountCounts;
}): AccountDTO {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    balance: account.balance.toFixed(2),
    transactionCount:
      (account._count?.transactions ?? 0) +
      (account._count?.transfersIn ?? 0) +
      (account._count?.outgoingTransferRequests ?? 0) +
      (account._count?.incomingTransferRequests ?? 0),
  };
}

const countInclude = {
  _count: {
    select: {
      transactions: true,
      transfersIn: true,
      outgoingTransferRequests: true,
      incomingTransferRequests: true,
    },
  },
} as const;

/**
 * Devise de référence : MGA si présente, sinon celle du premier compte
 * (null si aucun compte actif). Partagée par budgets/goals pour les
 * calculs et messages (comptes non archivés uniquement).
 */
export async function getPrimaryCurrency(
  tx: Prisma.TransactionClient,
  userId: string,
): Promise<Currency | null> {
  const accounts = await tx.account.findMany({
    where: { userId, isArchived: false },
    orderBy: { createdAt: "asc" },
    select: { currency: true },
  });
  if (accounts.length === 0) return null;
  return (accounts.some((a) => a.currency === "MGA")
    ? "MGA"
    : accounts[0].currency) as Currency;
}

/** Liste les comptes de l'utilisateur, triés par date de création. */
export async function listAccounts(
  userId: string,
): Promise<AccountsResult<AccountDTO[]>> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: countInclude,
  });
  return { data: accounts.map(toDTO) };
}

/** Crée un compte pour l'utilisateur (nom unique par utilisateur). */
export async function createAccount(
  userId: string,
  input: CreateAccountInput,
): Promise<AccountsResult<AccountDTO>> {
  const parsed = createAccountSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    const account = await prisma.account.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        currency: parsed.data.currency,
        balance: new Prisma.Decimal(parsed.data.balance.toFixed(2)),
        userId,
      },
      include: countInclude,
    });
    return { data: toDTO(account) };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Un compte porte déjà ce nom." };
    }
    throw error;
  }
}

/** Modifie un compte appartenant à l'utilisateur. */
export async function updateAccount(
  userId: string,
  input: UpdateAccountInput,
): Promise<AccountsResult<AccountDTO>> {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const existing = await prisma.account.findFirst({
    where: { id: parsed.data.id, userId },
  });
  if (!existing) return { error: "Compte introuvable." };

  try {
    const account = await prisma.account.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        currency: parsed.data.currency,
        balance: new Prisma.Decimal(parsed.data.balance.toFixed(2)),
      },
      include: countInclude,
    });
    return { data: toDTO(account) };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return { error: "Un compte porte déjà ce nom." };
    }
    throw error;
  }
}

/**
 * Supprime un compte appartenant à l'utilisateur.
 * Refusée si des transactions ou des demandes de transfert y sont liées :
 * le schéma cascaderait sinon vers la suppression de l'historique (y
 * compris celui de l'autre utilisateur pour les transferts).
 */
export async function deleteAccount(
  userId: string,
  id: string,
): Promise<AccountsResult> {
  const existing = await prisma.account.findFirst({
    where: { id, userId },
    include: countInclude,
  });
  if (!existing) return { error: "Compte introuvable." };

  const linkedTx = existing._count.transactions + existing._count.transfersIn;
  const linkedRequests =
    existing._count.outgoingTransferRequests +
    existing._count.incomingTransferRequests;
  if (linkedTx > 0 || linkedRequests > 0) {
    const parts: string[] = [];
    if (linkedTx > 0) parts.push(`${linkedTx} transaction(s)`);
    if (linkedRequests > 0)
      parts.push(`${linkedRequests} demande(s) de transfert`);
    return {
      error: `Impossible de supprimer ce compte : ${parts.join(" et ")} y sont liées.`,
    };
  }

  await prisma.account.delete({ where: { id: existing.id } });
  return { data: undefined };
}
