"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, PiggyBank, Plus } from "lucide-react";
import { useState } from "react";

import { BudgetCard } from "@/components/budgets/budget-card";
import {
  BudgetFormDialog,
  type BudgetCategoryOption,
} from "@/components/budgets/budget-form-dialog";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import type { Currency } from "@/lib/account-schemas";
import type { BudgetDTO } from "@/lib/services/budgets";
import { cn } from "@/lib/utils";

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function BudgetsPageClient({
  budgets,
  month,
  monthLabel,
  currency,
  categories,
}: {
  budgets: BudgetDTO[];
  month: string;
  monthLabel: string;
  currency: Currency;
  categories: BudgetCategoryOption[];
}) {
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
          <p className="text-muted-foreground">
            Plafonds mensuels par catégorie, avec alertes automatiques.
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nouveau budget
        </Button>
      </div>

      <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-2">
        <Link
          href={`/budgets?month=${shiftMonth(month, -1)}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          aria-label="Mois précédent"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Précédent</span>
        </Link>
        <p className="font-medium capitalize" role="status">
          {monthLabel}
        </p>
        <Link
          href={`/budgets?month=${shiftMonth(month, 1)}`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          aria-label="Mois suivant"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {budgets.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <PiggyBank className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Aucun budget en {monthLabel}</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Créez un budget mensuel lié à une catégorie pour suivre vos
              dépenses et recevoir des alertes.
            </p>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Créer un budget
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              currency={currency}
              categories={categories}
            />
          ))}
        </div>
      )}

      <BudgetFormDialog
        categories={categories}
        defaultMonth={month}
        open={createOpen}
        onOpenChange={setCreateOpen}
      />
    </section>
  );
}
