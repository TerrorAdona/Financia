import { Prisma, type AccountType } from "@prisma/client";

import {
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
  type UpdateAccountInput,
} from "@/lib/account-schemas";
import { prisma } from "@/lib/prisma";

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

function toDTO(account: {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  balance: Prisma.Decimal;
  _count?: { transactions: number; transfersIn: number };
}): AccountDTO {
  return {
    id: account.id,
    name: account.name,
    type: account.type,
    currency: account.currency,
    balance: account.balance.toFixed(2),
    transactionCount:
      (account._count?.transactions ?? 0) + (account._count?.transfersIn ?? 0),
  };
}

function firstIssue(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  ) {
    const first = (error as { issues: Array<{ message?: unknown }> }).issues[0];
    if (typeof first?.message === "string") return first.message;
  }
  return "Données invalides.";
}

/** Liste les comptes de l'utilisateur, triés par date de création. */
export async function listAccounts(
  userId: string,
): Promise<AccountsResult<AccountDTO[]>> {
  const accounts = await prisma.account.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { transactions: true, transfersIn: true } },
    },
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
      include: {
        _count: { select: { transactions: true, transfersIn: true } },
      },
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
      include: {
        _count: { select: { transactions: true, transfersIn: true } },
      },
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
 * Refusée si des transactions y sont liées (le schéma cascaderait
 * sinon vers la suppression de l'historique).
 */
export async function deleteAccount(
  userId: string,
  id: string,
): Promise<AccountsResult> {
  const existing = await prisma.account.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { transactions: true, transfersIn: true } },
    },
  });
  if (!existing) return { error: "Compte introuvable." };

  const linked = existing._count.transactions + existing._count.transfersIn;
  if (linked > 0) {
    return {
      error: `Impossible de supprimer ce compte : ${linked} transaction(s) y sont liées.`,
    };
  }

  await prisma.account.delete({ where: { id: existing.id } });
  return { data: undefined };
}
