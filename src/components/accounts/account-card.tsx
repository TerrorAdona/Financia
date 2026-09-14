"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { AccountFormDialog } from "@/components/accounts/account-form-dialog";
import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { DeleteAccountDialog } from "@/components/accounts/delete-account-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ACCOUNT_TYPE_LABELS, formatMoney } from "@/lib/money";
import type { AccountDTO } from "@/lib/services/accounts";
import type { Currency } from "@/lib/account-schemas";

export function AccountCard({ account }: { account: AccountDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <AccountTypeIcon type={account.type} className="size-5 text-muted-foreground" />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{account.name}</CardTitle>
            <CardDescription>
              <Badge variant="secondary" className="mt-1">
                {ACCOUNT_TYPE_LABELS[account.type]}
              </Badge>
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-2xl font-bold tracking-tight tabular-nums">
            {formatMoney(account.balance, account.currency as Currency)}
          </p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {account.transactionCount} transaction(s)
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`Modifier ${account.name}`}
                title="Modifier"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`Supprimer ${account.name}`}
                title="Supprimer"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <AccountFormDialog
        account={account}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteAccountDialog
        account={account}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
