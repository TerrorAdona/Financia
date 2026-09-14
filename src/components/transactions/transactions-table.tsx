"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog";
import {
  TransactionFormDialog,
  type TransactionFormData,
} from "@/components/transactions/transaction-form-dialog";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { TRANSACTION_TYPE_LABELS } from "@/lib/transaction-schemas";
import type { Currency } from "@/lib/account-schemas";
import type { TransactionListItem } from "@/lib/services/transactions";
import { cn } from "@/lib/utils";

function AmountCell({ item }: { item: TransactionListItem }) {
  const sign = item.type === "INCOME" ? "+" : item.type === "EXPENSE" ? "−" : "";
  return (
    <span
      className={cn(
        "font-semibold tabular-nums whitespace-nowrap",
        item.type === "INCOME" && "text-green-600 dark:text-green-400",
        item.type === "EXPENSE" && "text-destructive",
      )}
    >
      {sign}
      {formatMoney(item.amount, item.account.currency as Currency)}
    </span>
  );
}

export function TransactionsTable({
  items,
  formData,
}: {
  items: TransactionListItem[];
  formData: TransactionFormData;
}) {
  const [editing, setEditing] = useState<TransactionListItem | null>(null);
  const [deleting, setDeleting] = useState<TransactionListItem | null>(null);

  return (
    <>
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Compte</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-20 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="whitespace-nowrap text-muted-foreground">
                  {formatShortDate(item.date)}
                </TableCell>
                <TableCell>
                  <span className="block max-w-56 truncate font-medium">
                    {item.description}
                  </span>
                  {item.note ? (
                    <span className="block max-w-56 truncate text-xs text-muted-foreground">
                      {item.note}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell>
                  {item.category ? (
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                      <CategoryIcon
                        name={item.category.icon}
                        className="size-4"
                        style={{ color: item.category.color }}
                      />
                      {item.category.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {item.toAccount
                    ? `${item.account.name} → ${item.toAccount.name}`
                    : item.account.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={item.type === "INCOME" ? "default" : "secondary"}
                  >
                    {TRANSACTION_TYPE_LABELS[item.type]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <AmountCell item={item} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      aria-label={`Modifier ${item.description}`}
                      title="Modifier"
                      onClick={() => setEditing(item)}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      aria-label={`Supprimer ${item.description}`}
                      title="Supprimer"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(item)}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TransactionFormDialog
        transaction={editing}
        formData={formData}
        open={!!editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
      <DeleteTransactionDialog
        transaction={deleting}
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      />
    </>
  );
}
