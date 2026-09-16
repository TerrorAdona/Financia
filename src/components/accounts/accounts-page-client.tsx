"use client";

import { ArrowRightLeft, Plus, Wallet } from "lucide-react";
import { useState } from "react";

import { AccountCard } from "@/components/accounts/account-card";
import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { TransferDialog } from "@/components/transfers/transfer-dialog";
import { Button } from "@/components/ui/button";
import type { AccountDTO } from "@/lib/services/accounts";
import type { TransferAccountOption } from "@/lib/services/transfers";

export function AccountsPageClient({
  accounts,
  transferAccounts,
}: {
  accounts: AccountDTO[];
  transferAccounts: TransferAccountOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Comptes</h1>
          <p className="text-muted-foreground">
            {accounts.length === 0
              ? "Aucun compte pour le moment."
              : `${accounts.length} compte(s) — soldes en devise d'origine.`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => setTransferOpen(true)}
            disabled={transferAccounts.length < 2}
            title={
              transferAccounts.length < 2
                ? "Créez au moins deux comptes actifs pour effectuer un transfert."
                : "Transférer entre deux de vos comptes"
            }
          >
            <ArrowRightLeft className="size-4" aria-hidden="true" />
            Nouveau transfert
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nouveau compte
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Wallet className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Aucun compte</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Créez votre premier compte (banque, espèces, mobile money…)
              pour commencer à suivre vos finances.
            </p>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Créer un compte
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
        </div>
      )}

      <AccountFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <TransferDialog
        accounts={transferAccounts}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </section>
  );
}
