"use client";

import { useRouter } from "next/navigation";
import {
  ArrowDownLeft,
  ArrowRightLeft,
  ArrowUpRight,
  Check,
  History,
  Inbox,
  Send,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  acceptTransferAction,
  cancelTransferAction,
  rejectTransferAction,
} from "@/app/actions/transfers";
import { formatNotificationDate } from "@/components/notifications/notification-kind";
import { TransferDialog } from "@/components/transfers/transfer-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Currency } from "@/lib/account-schemas";
import { formatMoney } from "@/lib/money";
import type {
  TransferAccountOption,
  TransferRequestDTO,
  TransferRequestState,
} from "@/lib/services/transfers";
import { cn } from "@/lib/utils";

type Lists = {
  pendingReceived: TransferRequestDTO[];
  pendingSent: TransferRequestDTO[];
  history: TransferRequestDTO[];
};

const STATUS_CONFIG: Record<
  TransferRequestState,
  { label: string; badge: string }
> = {
  PENDING: {
    label: "En attente",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  COMPLETED: {
    label: "Accepté",
    badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  REJECTED: {
    label: "Refusé",
    badge: "bg-destructive/10 text-destructive",
  },
  CANCELLED: {
    label: "Annulé",
    badge: "bg-muted text-muted-foreground",
  },
};

function partyName(
  party: { name: string | null; email: string },
  currentUserId: string,
  partyId: string,
): string {
  if (partyId === currentUserId) return "Vous";
  return party.name?.trim() ? party.name.trim() : party.email;
}

function RequestCard({
  request,
  direction,
  currentUserId,
  pending,
  onAccept,
  onReject,
  onCancel,
}: {
  request: TransferRequestDTO;
  direction: "received" | "sent" | "history";
  currentUserId: string;
  pending: boolean;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const status = STATUS_CONFIG[request.status];
  const currency = request.fromAccount.currency as Currency;
  const DirectionIcon =
    direction === "received"
      ? ArrowDownLeft
      : direction === "sent"
        ? ArrowUpRight
        : ArrowRightLeft;

  return (
    <Card>
      <CardContent className="flex gap-3 py-4">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"
          aria-hidden="true"
        >
          <DirectionIcon className="size-5" />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-sm font-semibold">
              {formatMoney(request.amount, currency)}
              <span className="font-normal text-muted-foreground">
                {" "}
                — {partyName(request.sender, currentUserId, request.sender.id)}{" "}
                →{" "}
                {partyName(
                  request.recipient,
                  currentUserId,
                  request.recipient.id,
                )}
              </span>
            </p>
            <Badge variant="secondary" className={cn("shrink-0 border-0", status.badge)}>
              {status.label}
            </Badge>
          </div>
          <p className="text-sm break-words text-muted-foreground">
            {request.fromAccount.name} → {request.toAccount.name}
            {request.description ? ` · ${request.description}` : null}
          </p>
          <p className="text-xs text-muted-foreground">
            Demandé le {formatNotificationDate(request.createdAt)}
            {request.decidedAt
              ? ` · traité le ${formatNotificationDate(request.decidedAt)}`
              : null}
          </p>
          {direction === "received" ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => onAccept(request.id)}
                aria-label={`Accepter le transfert de ${request.amount}`}
              >
                <Check className="size-4" aria-hidden="true" />
                {pending ? "Traitement…" : "Accepter"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => onReject(request.id)}
                aria-label="Refuser le transfert"
              >
                <X className="size-4" aria-hidden="true" />
                Refuser
              </Button>
            </div>
          ) : null}
          {direction === "sent" ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => onCancel(request.id)}
                aria-label="Annuler la demande"
              >
                <X className="size-4" aria-hidden="true" />
                {pending ? "Annulation…" : "Annuler la demande"}
              </Button>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  count,
}: {
  icon: typeof Inbox;
  title: string;
  count: number;
}) {
  return (
    <h2 className="flex items-center gap-2 text-lg font-semibold">
      <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      {title}
      <Badge variant="secondary">{count}</Badge>
    </h2>
  );
}

export function TransfersPageClient({
  initial,
  accounts,
  currentUserId,
}: {
  initial: Lists;
  accounts: TransferAccountOption[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [lists, setLists] = useState<Lists>(initial);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);

  const withPending = async (id: string, fn: () => Promise<void>) => {
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      await fn();
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const moveToHistory = (updated: TransferRequestDTO) => {
    setLists((prev) => ({
      pendingReceived: prev.pendingReceived.filter((r) => r.id !== updated.id),
      pendingSent: prev.pendingSent.filter((r) => r.id !== updated.id),
      history: [updated, ...prev.history],
    }));
  };

  const accept = (id: string) =>
    withPending(id, async () => {
      const result = await acceptTransferAction({ id });
      if (result.error || !result.data) {
        toast.error(result.error ?? "Confirmation impossible.");
        return;
      }
      toast.success("Transfert confirmé : les fonds ont été déplacés.");
      moveToHistory(result.data);
      router.refresh();
    });

  const reject = (id: string) =>
    withPending(id, async () => {
      const result = await rejectTransferAction({ id });
      if (result.error || !result.data) {
        toast.error(result.error ?? "Refus impossible.");
        return;
      }
      toast.success("Transfert refusé : aucun fonds déplacé.");
      moveToHistory(result.data);
      router.refresh();
    });

  const cancel = (id: string) =>
    withPending(id, async () => {
      const result = await cancelTransferAction({ id });
      if (result.error || !result.data) {
        toast.error(result.error ?? "Annulation impossible.");
        return;
      }
      toast.success("Demande annulée.");
      moveToHistory(result.data);
      router.refresh();
    });

  const isEmpty =
    lists.pendingReceived.length === 0 &&
    lists.pendingSent.length === 0 &&
    lists.history.length === 0;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transferts</h1>
          <p className="text-muted-foreground" role="status">
            {lists.pendingReceived.length > 0
              ? `${lists.pendingReceived.length} demande${lists.pendingReceived.length > 1 ? "s" : ""} en attente de votre confirmation.`
              : "Demandes entre utilisateurs, avec confirmation du destinataire."}
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={accounts.length === 0}
        >
          <ArrowRightLeft className="size-4" aria-hidden="true" />
          Nouveau transfert
        </Button>
      </div>

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <ArrowRightLeft className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Aucun transfert entre utilisateurs</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Envoyez une demande à un autre utilisateur : il recevra une
              notification et devra confirmer avant tout mouvement de fonds.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={accounts.length === 0}
          >
            Envoyer une demande
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <SectionTitle
              icon={Inbox}
              title="En attente de votre confirmation"
              count={lists.pendingReceived.length}
            />
            {lists.pendingReceived.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune demande à confirmer pour le moment.
              </p>
            ) : (
              <ul className="flex flex-col gap-3" aria-label="Demandes reçues">
                {lists.pendingReceived.map((r) => (
                  <li key={r.id}>
                    <RequestCard
                      request={r}
                      direction="received"
                      currentUserId={currentUserId}
                      pending={pendingIds.has(r.id)}
                      onAccept={(id) => void accept(id)}
                      onReject={(id) => void reject(id)}
                      onCancel={(id) => void cancel(id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <SectionTitle
              icon={Send}
              title="Vos demandes envoyées"
              count={lists.pendingSent.length}
            />
            {lists.pendingSent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucune demande envoyée en attente.
              </p>
            ) : (
              <ul className="flex flex-col gap-3" aria-label="Demandes envoyées">
                {lists.pendingSent.map((r) => (
                  <li key={r.id}>
                    <RequestCard
                      request={r}
                      direction="sent"
                      currentUserId={currentUserId}
                      pending={pendingIds.has(r.id)}
                      onAccept={(id) => void accept(id)}
                      onReject={(id) => void reject(id)}
                      onCancel={(id) => void cancel(id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-3">
            <SectionTitle
              icon={History}
              title="Historique"
              count={lists.history.length}
            />
            {lists.history.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Aucun transfert traité pour le moment.
              </p>
            ) : (
              <ul className="flex flex-col gap-3" aria-label="Historique des transferts">
                {lists.history.map((r) => (
                  <li key={r.id}>
                    <RequestCard
                      request={r}
                      direction="history"
                      currentUserId={currentUserId}
                      pending={pendingIds.has(r.id)}
                      onAccept={(id) => void accept(id)}
                      onReject={(id) => void reject(id)}
                      onCancel={(id) => void cancel(id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      <TransferDialog
        accounts={accounts}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </section>
  );
}
