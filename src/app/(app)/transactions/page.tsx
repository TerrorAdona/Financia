import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { TransactionsPageClient } from "@/components/transactions/transactions-page-client";
import { buttonVariants } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-helpers";
import {
  getTransactionFormData,
  listTransactions,
} from "@/lib/services/transactions";
import type { TransactionSort } from "@/lib/transaction-schemas";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transactions",
  description: "Suivez vos revenus et dépenses.",
};

type SearchParams = {
  q?: string;
  type?: string;
  categoryId?: string;
  accountId?: string;
  from?: string;
  to?: string;
  sort?: string;
  page?: string;
  pageSize?: string;
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;

  const [result, formData] = await Promise.all([
    listTransactions(userId, params),
    getTransactionFormData(userId),
  ]);

  if (result.error || !result.data) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <CircleAlert className="size-7 text-destructive" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Transactions indisponibles</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {result.error ?? "Impossible de charger vos transactions."}{" "}
            Veuillez réessayer.
          </p>
        </div>
        <Link
          href="/transactions"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Réessayer
        </Link>
      </section>
    );
  }

  const hasActiveFilters = !!(
    params.q ||
    params.type ||
    params.categoryId ||
    params.accountId ||
    params.from ||
    params.to
  );

  return (
    <TransactionsPageClient
      result={result.data}
      filters={{
        q: params.q ?? "",
        type: params.type,
        categoryId: params.categoryId,
        accountId: params.accountId,
        from: params.from,
        to: params.to,
        sort: (params.sort as TransactionSort | undefined) ?? "date_desc",
      }}
      filterOptions={{
        accounts: formData.accounts.map((a) => ({ id: a.id, name: a.name })),
        categories: formData.categories.map((c) => ({
          id: c.id,
          name: c.name,
          type: c.type,
        })),
      }}
      formData={formData}
      hasActiveFilters={hasActiveFilters}
    />
  );
}
