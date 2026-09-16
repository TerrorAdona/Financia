import { Prisma, type TransactionType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { notifyLargeTransaction, isLargeTransaction } from "@/lib/services/notifications";
import {
  createTransactionSchema,
  transactionFiltersSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
  type TransactionFilters,
  type UpdateTransactionInput,
} from "@/lib/transaction-schemas";

export type TransactionKind = Exclude<TransactionType, never>;

export type TransactionListItem = {
  id: string;
  description: string;
  amount: string;
  type: TransactionKind;
  date: string;
  note: string | null;
  account: { id: string; name: string; currency: string };
  toAccount: { id: string; name: string; currency: string } | null;
  category: { id: string; name: string; color: string; icon: string } | null;
};

export type TransactionListResult = {
  items: TransactionListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type TransactionsResult<T = undefined> = {
  data?: T;
  error?: string;
};

type TxRow = {
  id: string;
  description: string;
  amount: Prisma.Decimal;
  type: TransactionType;
  date: Date;
  note: string | null;
  account: { id: string; name: string; currency: string };
  toAccount: { id: string; name: string; currency: string } | null;
  category: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
};

function toDTO(row: TxRow): TransactionListItem {
  return {
    id: row.id,
    description: row.description,
    amount: row.amount.toFixed(2),
    type: row.type,
    date: row.date.toISOString(),
    note: row.note,
    account: row.account,
    toAccount: row.toAccount,
    category: row.category
      ? {
          id: row.category.id,
          name: row.category.name,
          color: row.category.color ?? "#64748b",
          icon: row.category.icon ?? "Tag",
        }
      : null,
  };
}

const rowInclude = {
  account: { select: { id: true, name: true, currency: true } },
  toAccount: { select: { id: true, name: true, currency: true } },
  category: { select: { id: true, name: true, color: true, icon: true } },
} as const;

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

function toDecimal(n: number): Prisma.Decimal {
  return new Prisma.Decimal(n.toFixed(2));
}

type BalanceMove = { accountId: string; delta: Prisma.Decimal };

/** Effet sur les soldes : INCOME +, EXPENSE -, TRANSFER -/+ . */
function effectOf(input: {
  type: TransactionKind;
  amount: Prisma.Decimal;
  accountId: string;
  toAccountId?: string | null;
}): BalanceMove[] {
  if (input.type === "INCOME")
    return [{ accountId: input.accountId, delta: input.amount }];
  if (input.type === "EXPENSE")
    return [{ accountId: input.accountId, delta: input.amount.neg() }];
  return [
    { accountId: input.accountId, delta: input.amount.neg() },
    { accountId: input.toAccountId as string, delta: input.amount },
  ];
}

async function adjustBalances(
  tx: Prisma.TransactionClient,
  moves: BalanceMove[],
): Promise<void> {
  for (const move of moves) {
    const account = await tx.account.findUnique({
      where: { id: move.accountId },
      select: { balance: true },
    });
    if (!account) throw new Error("Compte introuvable.");
    await tx.account.update({
      where: { id: move.accountId },
      data: { balance: account.balance.add(move.delta) },
    });
  }
}

type ValidRelations = {
  accountId: string;
  toAccountId: string | null;
  categoryId: string | null;
};

async function checkRelations(
  tx: Prisma.TransactionClient,
  userId: string,
  input: {
    type: TransactionKind;
    accountId: string;
    toAccountId?: string | null;
    categoryId?: string | null;
  },
): Promise<{ error?: string; relations?: ValidRelations }> {
  const account = await tx.account.findFirst({
    where: { id: input.accountId, userId },
    select: { id: true },
  });
  if (!account) return { error: "Compte introuvable." };

  let toAccountId: string | null = null;
  if (input.type === "TRANSFER") {
    const dest = await tx.account.findFirst({
      where: { id: input.toAccountId as string, userId },
      select: { id: true },
    });
    if (!dest) return { error: "Compte destinataire introuvable." };
    toAccountId = dest.id;
  }

  let categoryId: string | null = null;
  if (input.type !== "TRANSFER") {
    const category = await tx.category.findFirst({
      where: { id: input.categoryId as string, userId },
      select: { id: true, type: true },
    });
    if (!category) return { error: "Catégorie introuvable." };
    if (category.type !== input.type) {
      return {
        error: `Cette catégorie est de type ${category.type === "INCOME" ? "revenu" : "dépense"}.`,
      };
    }
    categoryId = category.id;
  }

  return { relations: { accountId: account.id, toAccountId, categoryId } };
}

/** Liste paginée/filtrée/triée — ne charge que les colonnes du tableau. */
export async function listTransactions(
  userId: string,
  rawFilters: unknown,
): Promise<TransactionsResult<TransactionListResult>> {
  const parsed = transactionFiltersSchema.safeParse(rawFilters ?? {});
  if (!parsed.success) return { error: "Filtres invalides." };
  const f: TransactionFilters = parsed.data;

  const where: Prisma.TransactionWhereInput = { userId };
  const and: Prisma.TransactionWhereInput[] = [];
  if (f.q) {
    and.push({
      OR: [
        { description: { contains: f.q, mode: "insensitive" } },
        { note: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }
  if (f.type) where.type = f.type;
  if (f.categoryId) where.categoryId = f.categoryId;
  if (f.accountId) {
    // Compte source OU destinataire (transferts inclus).
    and.push({
      OR: [{ accountId: f.accountId }, { toAccountId: f.accountId }],
    });
  }
  if (and.length > 0) where.AND = and;
  if (f.from || f.to) {
    where.date = {
      ...(f.from ? { gte: new Date(`${f.from}T00:00:00`) } : {}),
      ...(f.to ? { lte: new Date(`${f.to}T23:59:59.999`) } : {}),
    };
  }

  const orderBy: Prisma.TransactionOrderByWithRelationInput[] =
    f.sort === "date_asc"
      ? [{ date: "asc" }, { id: "asc" }]
      : f.sort === "amount_desc"
        ? [{ amount: "desc" }, { id: "desc" }]
        : f.sort === "amount_asc"
          ? [{ amount: "asc" }, { id: "asc" }]
          : [{ date: "desc" }, { id: "desc" }];

  const total = await prisma.transaction.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / f.pageSize));
  const page = Math.min(f.page, totalPages);

  const rows = await prisma.transaction.findMany({
    where,
    orderBy,
    skip: (page - 1) * f.pageSize,
    take: f.pageSize,
    include: rowInclude,
  });

  return {
    data: {
      items: rows.map(toDTO),
      total,
      page,
      pageSize: f.pageSize,
      totalPages,
    },
  };
}

/** Crée une transaction et ajuste les soldes (tout ou rien). */
export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionsResult<TransactionListItem>> {
  const parsed = createTransactionSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const amount = toDecimal(v.amount);

  try {
    const row = await prisma.$transaction(async (tx) => {
      const checked = await checkRelations(tx, userId, {
        type: v.type,
        accountId: v.accountId,
        toAccountId: v.toAccountId,
        categoryId: v.categoryId,
      });
      if (checked.error) throw new Error(checked.error);
      const created = await tx.transaction.create({
        data: {
          description: v.description,
          amount,
          type: v.type,
          date: v.date,
          note: v.note || null,
          userId,
          accountId: checked.relations!.accountId,
          toAccountId: checked.relations!.toAccountId,
          categoryId: checked.relations!.categoryId,
        },
        include: rowInclude,
      });
      await adjustBalances(
        tx,
        effectOf({
          type: v.type,
          amount,
          accountId: created.accountId,
          toAccountId: created.toAccountId,
        }),
      );
      return created;
    });
    // Transaction importante : notification dédiée (une par transaction).
    await notifyLargeTransaction(userId, {
      description: row.description,
      amount: Number(row.amount.toFixed(2)),
      currency: row.account.currency,
      type: row.type,
    });
    return { data: toDTO(row) };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

/** Modifie une transaction : annule l'ancien effet solde, applique le nouveau. */
export async function updateTransaction(
  userId: string,
  input: UpdateTransactionInput,
): Promise<TransactionsResult<TransactionListItem>> {
  const parsed = updateTransactionSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const amount = toDecimal(v.amount);

  try {
    let previousAmount: number | null = null;
    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.transaction.findFirst({
        where: { id: v.id, userId },
      });
      if (!existing) throw new Error("Transaction introuvable.");
      previousAmount = Number(existing.amount.toFixed(2));

      const checked = await checkRelations(tx, userId, {
        type: v.type,
        accountId: v.accountId,
        toAccountId: v.toAccountId,
        categoryId: v.categoryId,
      });
      if (checked.error) throw new Error(checked.error);

      // Annule l'ancien effet.
      await adjustBalances(
        tx,
        effectOf({
          type: existing.type,
          amount: existing.amount,
          accountId: existing.accountId,
          toAccountId: existing.toAccountId,
        }).map((m) => ({ ...m, delta: m.delta.neg() })),
      );

      const updated = await tx.transaction.update({
        where: { id: existing.id },
        data: {
          description: v.description,
          amount,
          type: v.type,
          date: v.date,
          note: v.note || null,
          accountId: checked.relations!.accountId,
          toAccountId: checked.relations!.toAccountId,
          categoryId: checked.relations!.categoryId,
        },
        include: rowInclude,
      });
      await adjustBalances(
        tx,
        effectOf({
          type: v.type,
          amount,
          accountId: updated.accountId,
          toAccountId: updated.toAccountId,
        }),
      );
      return updated;
    });
    // Devient importante à la modification : notifie une seule fois au franchissement.
    const nextAmount = Number(row.amount.toFixed(2));
    if (
      previousAmount !== null &&
      !isLargeTransaction(previousAmount, row.account.currency) &&
      isLargeTransaction(nextAmount, row.account.currency)
    ) {
      await notifyLargeTransaction(userId, {
        description: row.description,
        amount: nextAmount,
        currency: row.account.currency,
        type: row.type,
      });
    }
    return { data: toDTO(row) };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

/** Supprime une transaction et restaure les soldes. */
export async function deleteTransaction(
  userId: string,
  id: string,
): Promise<TransactionsResult> {
  const existing = await prisma.transaction.findFirst({
    where: { id, userId },
  });
  if (!existing) return { error: "Transaction introuvable." };

  await prisma.$transaction(async (tx) => {
    await adjustBalances(
      tx,
      effectOf({
        type: existing.type,
        amount: existing.amount,
        accountId: existing.accountId,
        toAccountId: existing.toAccountId,
      }).map((m) => ({ ...m, delta: m.delta.neg() })),
    );
    await tx.transaction.delete({ where: { id: existing.id } });
  });
  return { data: undefined };
}

/** Comptes et catégories de l'utilisateur pour les formulaires/filtres. */
export async function getTransactionFormData(userId: string): Promise<{
  accounts: Array<{ id: string; name: string; currency: string }>;
  categories: Array<{
    id: string;
    name: string;
    type: TransactionKind;
    color: string;
    icon: string;
  }>;
}> {
  const [accounts, categories] = await Promise.all([
    prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, currency: true },
    }),
    prisma.category.findMany({
      where: { userId },
      orderBy: [{ type: "asc" }, { name: "asc" }],
      select: { id: true, name: true, type: true, color: true, icon: true },
    }),
  ]);
  return {
    accounts,
    categories: categories
      .filter((c) => c.type !== "TRANSFER")
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type as TransactionKind,
        color: c.color ?? "#64748b",
        icon: c.icon ?? "Tag",
      })),
  };
}
