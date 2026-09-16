import { Prisma, type TransferRequestStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { firstIssue } from "@/lib/validation";
import type { Currency } from "@/lib/account-schemas";
import { formatMoney } from "@/lib/money";
import {
  createTransferSchema,
  recipientSearchSchema,
  requestTransferSchema,
  transferDecisionSchema,
  type CreateTransferInput,
  type RequestTransferInput,
  type TransferDecisionInput,
} from "@/lib/transfer-schemas";
import {
  notifyLargeTransaction,
  transferAcceptedTitle,
  transferCancelledTitle,
  transferReceivedTitle,
  transferRejectedTitle,
} from "@/lib/services/notifications";
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

/* ------------------------------------------------------------------ */
/* Transferts inter-utilisateurs : demande + confirmation              */
/* ------------------------------------------------------------------ */

export type TransferRequestState = TransferRequestStatus;

export type RecipientOption = {
  id: string;
  name: string | null;
  email: string;
};

/** Compte d'un destinataire : sans solde (confidentialité). */
export type RecipientAccountOption = {
  id: string;
  name: string;
  currency: string;
};

export type TransferRequestDTO = {
  id: string;
  amount: string;
  description: string | null;
  status: TransferRequestState;
  sender: { id: string; name: string | null; email: string };
  recipient: { id: string; name: string | null; email: string };
  fromAccount: { id: string; name: string; currency: string };
  toAccount: { id: string; name: string; currency: string };
  transactionId: string | null;
  decidedAt: string | null;
  createdAt: string;
};

type TransferRequestRow = Prisma.TransferRequestGetPayload<{
  include: {
    sender: { select: { id: true; name: true; email: true } };
    recipient: { select: { id: true; name: true; email: true } };
    fromAccount: { select: { id: true; name: true; currency: true } };
    toAccount: { select: { id: true; name: true; currency: true } };
  };
}>;

const requestInclude = {
  sender: { select: { id: true, name: true, email: true } },
  recipient: { select: { id: true, name: true, email: true } },
  fromAccount: { select: { id: true, name: true, currency: true } },
  toAccount: { select: { id: true, name: true, currency: true } },
} as const;

function toRequestDTO(row: TransferRequestRow): TransferRequestDTO {
  return {
    id: row.id,
    amount: row.amount.toFixed(2),
    description: row.description,
    status: row.status,
    sender: row.sender,
    recipient: row.recipient,
    fromAccount: row.fromAccount,
    toAccount: row.toAccount,
    transactionId: row.transactionId,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Nom d'affichage : nom si renseigné, sinon email. */
export function displayName(user: {
  name: string | null;
  email: string;
}): string {
  return user.name?.trim() ? user.name.trim() : user.email;
}

/**
 * Recherche un destinataire par nom ou email (insensible à la casse).
 * Exclut l'utilisateur courant et les utilisateurs sans compte actif
 * (impossible d'y recevoir un transfert).
 */
export async function searchRecipients(
  userId: string,
  rawQuery: unknown,
): Promise<TransactionsResult<RecipientOption[]>> {
  const parsed = recipientSearchSchema.safeParse({ q: rawQuery });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const q = parsed.data.q;
  const rows = await prisma.user.findMany({
    where: {
      id: { not: userId },
      accounts: { some: { isArchived: false } },
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { name: "asc" },
    take: 8,
    select: { id: true, name: true, email: true },
  });
  return { data: rows };
}

/**
 * Comptes actifs d'un destinataire (nom + devise, SANS solde).
 * Le solde d'autrui ne doit jamais fuiter côté expéditeur.
 */
export async function listRecipientAccounts(
  userId: string,
  recipientId: string,
): Promise<TransactionsResult<RecipientAccountOption[]>> {
  if (!recipientId) return { error: "Destinataire requis." };
  if (recipientId === userId)
    return { error: "Sélectionnez un autre utilisateur." };
  const recipient = await prisma.user.findUnique({
    where: { id: recipientId },
    select: { id: true },
  });
  if (!recipient) return { error: "Destinataire introuvable." };
  const rows = await prisma.account.findMany({
    where: { userId: recipientId, isArchived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, currency: true },
  });
  return { data: rows };
}

type ExternalGuards = {
  error?: string;
  source?: { id: string; name: string; currency: string };
  dest?: { id: string; name: string; currency: string };
  recipientId?: string;
};

/**
 * Gardes d'un transfert VERS un autre utilisateur, à appeler DANS une
 * transaction Prisma : source possédée par l'expéditeur, destination
 * existante (tout utilisateur), non archivés, même devise, fonds
 * suffisants (lecture fraîche).
 */
async function checkExternalTransferGuards(
  tx: Prisma.TransactionClient,
  senderId: string,
  fromAccountId: string,
  toAccountId: string,
  amount: Prisma.Decimal,
): Promise<ExternalGuards> {
  const [source, dest] = await Promise.all([
    tx.account.findFirst({
      where: { id: fromAccountId, userId: senderId },
      select: { id: true, name: true, balance: true, currency: true, isArchived: true },
    }),
    tx.account.findFirst({
      where: { id: toAccountId },
      select: {
        id: true,
        name: true,
        balance: true,
        currency: true,
        isArchived: true,
        userId: true,
      },
    }),
  ]);
  if (!source) return { error: "Compte source introuvable." };
  if (!dest) return { error: "Compte destinataire introuvable." };
  if (dest.userId === senderId)
    return {
      error:
        "Ce compte vous appartient : utilisez le transfert instantané entre vos comptes.",
    };
  if (source.isArchived)
    return {
      error: `Le compte « ${source.name} » est archivé : transfert impossible.`,
    };
  if (dest.isArchived)
    return {
      error: `Le compte « ${dest.name} » est archivé : transfert impossible.`,
    };
  if (source.currency !== dest.currency)
    return {
      error:
        "Le transfert entre deux comptes de devises différentes est impossible.",
    };
  if (source.balance.lt(amount)) {
    const available = Number(source.balance.toFixed(2));
    const required = Number(amount.toFixed(2));
    return {
      error: `Solde insuffisant sur « ${source.name} » (disponible : ${formatMoney(available, source.currency as Currency)}, requis : ${formatMoney(required, source.currency as Currency)}).`,
    };
  }
  return {
    source: { id: source.id, name: source.name, currency: source.currency },
    dest: { id: dest.id, name: dest.name, currency: dest.currency },
    recipientId: dest.userId,
  };
}

/**
 * Crée une demande de transfert vers un autre utilisateur.
 * Aucun mouvement de fonds ni écriture à ce stade (statut PENDING) :
 * le destinataire est notifié et doit confirmer.
 */
export async function requestTransfer(
  senderId: string,
  input: RequestTransferInput,
): Promise<TransactionsResult<TransferRequestDTO>> {
  const parsed = requestTransferSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;
  const amount = new Prisma.Decimal(v.amount.toFixed(2));

  try {
    const row = await prisma.$transaction(async (tx) => {
      const guards = await checkExternalTransferGuards(
        tx,
        senderId,
        v.fromAccountId,
        v.toAccountId,
        amount,
      );
      if (guards.error) throw new Error(guards.error);

      const sender = await tx.user.findUniqueOrThrow({
        where: { id: senderId },
        select: { name: true, email: true },
      });

      const created = await tx.transferRequest.create({
        data: {
          amount,
          description: v.description?.trim() || null,
          status: "PENDING",
          senderId,
          recipientId: guards.recipientId as string,
          fromAccountId: guards.source!.id,
          toAccountId: guards.dest!.id,
        },
        include: requestInclude,
      });

      // Notification au destinataire — atomique avec la demande :
      // pas de demande sans notification.
      await tx.notification.create({
        data: {
          title: transferReceivedTitle(displayName(sender)),
          message: `${displayName(sender)} vous propose un transfert de ${formatMoney(Number(amount.toFixed(2)), guards.source!.currency as Currency)} vers votre compte « ${guards.dest!.name} ». Acceptez ou refusez depuis la page Transferts.`,
          type: "INFO",
          userId: guards.recipientId as string,
        },
      });

      return created;
    });
    return { data: toRequestDTO(row) };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

/** Demandes reçues / envoyées en attente + historique de l'utilisateur. */
export async function listTransferRequests(userId: string): Promise<
  TransactionsResult<{
    pendingReceived: TransferRequestDTO[];
    pendingSent: TransferRequestDTO[];
    history: TransferRequestDTO[];
  }>
> {
  const [pendingReceived, pendingSent, history] = await Promise.all([
    prisma.transferRequest.findMany({
      where: { recipientId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: requestInclude,
    }),
    prisma.transferRequest.findMany({
      where: { senderId: userId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: requestInclude,
    }),
    prisma.transferRequest.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
        status: { not: "PENDING" },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: requestInclude,
    }),
  ]);
  return {
    data: {
      pendingReceived: pendingReceived.map(toRequestDTO),
      pendingSent: pendingSent.map(toRequestDTO),
      history: history.map(toRequestDTO),
    },
  };
}

/**
 * Acceptation par le destinataire : l'écriture TRANSFER + débit/crédit
 * sont exécutés atomiquement ICI (jamais à la demande).
 * Les gardes sont re-vérifiées (le solde de l'expéditeur a pu changer).
 * Claim atomique anti double-confirmation (course entre deux appels).
 */
export async function acceptTransferRequest(
  userId: string,
  input: TransferDecisionInput,
): Promise<TransactionsResult<TransferRequestDTO>> {
  const parsed = transferDecisionSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  try {
    const row = await prisma.$transaction(async (tx) => {
      const existing = await tx.transferRequest.findUnique({
        where: { id: parsed.data.id },
        include: requestInclude,
      });
      if (!existing) throw new Error("Demande introuvable.");
      if (existing.recipientId !== userId)
        throw new Error("Seul le destinataire peut confirmer ce transfert.");
      if (existing.status !== "PENDING")
        throw new Error("Cette demande a déjà été traitée.");

      const amount = existing.amount;
      const guards = await checkExternalTransferGuards(
        tx,
        existing.senderId,
        existing.fromAccountId,
        existing.toAccountId,
        amount,
      );
      if (guards.error) throw new Error(guards.error);

      // Claim : un seul appel concurrent peut passer de PENDING à COMPLETED.
      const claimed = await tx.transferRequest.updateMany({
        where: { id: existing.id, status: "PENDING" },
        data: { status: "COMPLETED", decidedAt: new Date() },
      });
      if (claimed.count !== 1)
        throw new Error("Cette demande a déjà été traitée.");

      const created = await tx.transaction.create({
        data: {
          description:
            existing.description?.trim() ||
            `Transfert ${guards.source!.name} → ${guards.dest!.name}`,
          amount,
          type: "TRANSFER",
          date: new Date(),
          note: null,
          userId: existing.senderId,
          accountId: guards.source!.id,
          toAccountId: guards.dest!.id,
          categoryId: null,
        },
        include: transactionRowInclude,
      });

      const [srcBal, dstBal] = await Promise.all([
        tx.account.findUniqueOrThrow({
          where: { id: guards.source!.id },
          select: { balance: true },
        }),
        tx.account.findUniqueOrThrow({
          where: { id: guards.dest!.id },
          select: { balance: true },
        }),
      ]);
      await tx.account.update({
        where: { id: guards.source!.id },
        data: { balance: srcBal.balance.sub(amount) },
      });
      await tx.account.update({
        where: { id: guards.dest!.id },
        data: { balance: dstBal.balance.add(amount) },
      });

      await tx.transferRequest.update({
        where: { id: existing.id },
        data: { transactionId: created.id },
      });

      const recipient = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { name: true, email: true },
      });
      await tx.notification.create({
        data: {
          title: transferAcceptedTitle(displayName(recipient)),
          message: `${displayName(recipient)} a accepté votre transfert de ${formatMoney(Number(amount.toFixed(2)), guards.source!.currency as Currency)} vers « ${guards.dest!.name} ».`,
          type: "INFO",
          userId: existing.senderId,
        },
      });

      const fresh = await tx.transferRequest.findUniqueOrThrow({
        where: { id: existing.id },
        include: requestInclude,
      });
      return { fresh, txRow: created };
    });

    await notifyLargeTransaction(row.txRow.userId, {
      description: row.txRow.description,
      amount: Number(row.txRow.amount.toFixed(2)),
      currency: row.txRow.account.currency,
      type: row.txRow.type,
    });
    return { data: toRequestDTO(row.fresh) };
  } catch (error) {
    if (error instanceof Error) return { error: error.message };
    throw error;
  }
}

/** Refus par le destinataire : aucun mouvement, expéditeur notifié. */
export async function rejectTransferRequest(
  userId: string,
  input: TransferDecisionInput,
): Promise<TransactionsResult<TransferRequestDTO>> {
  const parsed = transferDecisionSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const existing = await prisma.transferRequest.findUnique({
    where: { id: parsed.data.id },
    include: {
      recipient: { select: { name: true, email: true } },
      fromAccount: { select: { currency: true } },
    },
  });
  if (!existing) return { error: "Demande introuvable." };
  if (existing.recipientId !== userId)
    return { error: "Seul le destinataire peut refuser ce transfert." };
  if (existing.status !== "PENDING")
    return { error: "Cette demande a déjà été traitée." };

  const rejected = await prisma.transferRequest.updateMany({
    where: { id: existing.id, status: "PENDING" },
    data: { status: "REJECTED", decidedAt: new Date() },
  });
  if (rejected.count !== 1) return { error: "Cette demande a déjà été traitée." };

  await prisma.notification.create({
    data: {
      title: transferRejectedTitle(displayName(existing.recipient)),
      message: `${displayName(existing.recipient)} a refusé votre transfert de ${formatMoney(Number(existing.amount.toFixed(2)), existing.fromAccount.currency as Currency)}. Aucun fonds n'a été déplacé.`,
      type: "INFO",
      userId: existing.senderId,
    },
  });

  const fresh = await prisma.transferRequest.findUniqueOrThrow({
    where: { id: existing.id },
    include: requestInclude,
  });
  return { data: toRequestDTO(fresh) };
}

/** Annulation par l'expéditeur (tant que PENDING), destinataire notifié. */
export async function cancelTransferRequest(
  userId: string,
  input: TransferDecisionInput,
): Promise<TransactionsResult<TransferRequestDTO>> {
  const parsed = transferDecisionSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const existing = await prisma.transferRequest.findUnique({
    where: { id: parsed.data.id },
    include: {
      sender: { select: { name: true, email: true } },
      fromAccount: { select: { currency: true } },
    },
  });
  if (!existing) return { error: "Demande introuvable." };
  if (existing.senderId !== userId)
    return { error: "Seul l'expéditeur peut annuler cette demande." };
  if (existing.status !== "PENDING")
    return { error: "Cette demande a déjà été traitée." };

  const cancelled = await prisma.transferRequest.updateMany({
    where: { id: existing.id, status: "PENDING" },
    data: { status: "CANCELLED", decidedAt: new Date() },
  });
  if (cancelled.count !== 1)
    return { error: "Cette demande a déjà été traitée." };

  await prisma.notification.create({
    data: {
      title: transferCancelledTitle(displayName(existing.sender)),
      message: `${displayName(existing.sender)} a annulé sa demande de transfert de ${formatMoney(Number(existing.amount.toFixed(2)), existing.fromAccount.currency as Currency)}.`,
      type: "INFO",
      userId: existing.recipientId,
    },
  });

  const fresh = await prisma.transferRequest.findUniqueOrThrow({
    where: { id: existing.id },
    include: requestInclude,
  });
  return { data: toRequestDTO(fresh) };
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
