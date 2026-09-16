"use client";

import { ArrowLeftRight, ArrowRightLeft, Plus, SearchX } from "lucide-react";
import { useState } from "react";

import {
  TransactionFilters,
  type FilterOptions,
  type FilterValues,
} from "@/components/transactions/transaction-filters";
import {
  TransactionFormDialog,
  type TransactionFormData,
} from "@/components/transactions/transaction-form-dialog";
import { TransactionsPagination } from "@/components/transactions/transactions-pagination";
import { TransactionsTable } from "@/components/transactions/transactions-table";
import { TransferDialog } from "@/components/transfers/transfer-dialog";
import { Button } from "@/components/ui/button";
import type { TransactionListResult } from "@/lib/services/transactions";

export function TransactionsPageClient({
  result,
  filters,
  filterOptions,
  formData,
  hasActiveFilters,
}: {
  result: TransactionListResult;
  filters: FilterValues;
  filterOptions: FilterOptions;
  formData: TransactionFormData;
  hasActiveFilters: boolean;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const empty = result.total === 0;

  return (
    <section className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            Revenus, dépenses et transferts entre vos comptes.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => setTransferOpen(true)}
            disabled={formData.accounts.length < 2}
            title={
              formData.accounts.length < 2
                ? "Créez au moins deux comptes pour effectuer un transfert."
                : "Transférer entre deux de vos comptes"
            }
          >
            <ArrowRightLeft className="size-4" aria-hidden="true" />
            Nouveau transfert
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle transaction
          </Button>
        </div>
      </div>

      <TransactionFilters options={filterOptions} initial={filters} />

      {empty ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            {hasActiveFilters ? (
              <SearchX className="size-7 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ArrowLeftRight className="size-7 text-muted-foreground" aria-hidden="true" />
            )}
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              {hasActiveFilters ? "Aucun résultat" : "Aucune transaction"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {hasActiveFilters
                ? "Aucune transaction ne correspond à ces filtres. Modifiez ou réinitialisez la recherche."
                : "Créez votre première transaction pour commencer le suivi."}
            </p>
          </div>
          {!hasActiveFilters ? (
            <Button type="button" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Créer une transaction
            </Button>
          ) : null}
        </div>
      ) : (
        <>
          <TransactionsTable items={result.items} formData={formData} />
          <TransactionsPagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            pageSize={result.pageSize}
          />
        </>
      )}

      <TransactionFormDialog
        formData={formData}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
      <TransferDialog
        accounts={formData.accounts}
        open={transferOpen}
        onOpenChange={setTransferOpen}
      />
    </section>
  );
}
