import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  createTransferSchema,
  type CreateTransferInput,
} from "@/lib/transfer-schemas";
import { notifyLargeTransaction } from "@/lib/services/notifications";
import {
  checkTransferGuards,
  toTransactionDTO,
  transactionRowInclude,
  type TransactionListItem,
  type TransactionsResult,
} from "@/lib/services/transactions";

export type TransferAccountOption = {
  id: string;
  name: string;
  currency: string;
  /** Solde exact sous forme de chaîne (pas d'arrondi flottant). */
  balance: string;
};

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

/** Comptes éligibles à un transfert : non archivés, triés par nom. */
export async function listTransferAccounts(
  userId: string,
): Promise<TransferAccountOption[]> {
  const rows = await prisma.account.findMany({
    where: { userId, isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, currency: true, balance: true },
  });
  return rows.map((r) => ({ ...r, balance: r.balance.toFixed(2) }));
}

/**
 * Effectue un transfert entre deux comptes du même utilisateur.
 *
 * Modèle comptable : UN seul enregistrement `Transaction` de type TRANSFER
 * (accountId = source, toAccountId = destination, categoryId = null) —
 * créer deux écritures (dépense + revenu) fausserait les revenus/dépenses
 * des tableaux de bord et analyses, qui excluent explicitement TRANSFER.
 *
 * Atomicité : écriture + débit source + crédit destination dans une seule
 * transaction database Prisma (tout ou rien).
 */
export async function createTransfer(
  userId: string,
  input: CreateTransferInput,
): Promise<TransactionsResult<TransactionListItem>> {
  const parsed = createTransferSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const amount = new Prisma.Decimal(v.amount.toFixed(2));

  try {
    const row = await prisma.$transaction(async (tx) => {
      const guardError = await checkTransferGuards(
        tx,
        userId,
        v.fromAccountId,
        v.toAccountId,
        amount,
      );
      if (guardError) throw new Error(guardError);

      const [source, dest] = await Promise.all([
        tx.account.findFirstOrThrow({ where: { id: v.fromAccountId, userId } }),
        tx.account.findFirstOrThrow({ where: { id: v.toAccountId, userId } }),
      ]);

      const created = await tx.transaction.create({
        data: {
          description:
            v.description?.trim() ||
            `Transfert ${source.name} → ${dest.name}`,
          amount,
          type: "TRANSFER",
          date: v.date ?? new Date(),
          note: null,
          userId,
          accountId: source.id,
          toAccountId: dest.id,
          categoryId: null,
        },
        include: transactionRowInclude,
      });

      // Débit source / crédit destination — indissociables de l'écriture.
      const [srcBal, dstBal] = await Promise.all([
        tx.account.findUniqueOrThrow({
          where: { id: source.id },
          select: { balance: true },
        }),
        tx.account.findUniqueOrThrow({
          where: { id: dest.id },
          select: { balance: true },
        }),
      ]);
      await tx.account.update({
        where: { id: source.id },
        data: { balance: srcBal.balance.sub(amount) },
      });
      await tx.account.update({
        where: { id: dest.id },
        data: { balance: dstBal.balance.add(amount) },
      });

      return created;
    });

    await notifyLargeTransaction(userId, {
      description: row.description,
      amount: Number(row.amount.toFixed(2)),
      currency: row.account.currency,
      type: row.type,
    });
    return { data: toTransactionDTO(row) };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}
