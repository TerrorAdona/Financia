"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { BudgetFormDialog } from "@/components/budgets/budget-form-dialog";
import type { BudgetCategoryOption } from "@/components/budgets/budget-form-dialog";
import { DeleteBudgetDialog } from "@/components/budgets/delete-budget-dialog";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { BUDGET_THRESHOLDS } from "@/lib/budget-schemas";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/account-schemas";
import type { BudgetDTO, BudgetStatus } from "@/lib/services/budgets";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<
  BudgetStatus,
  { label: string; badge: string; bar: string }
> = {
  ok: { label: "En bonne voie", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
  watch: { label: "50 % atteint", badge: "bg-primary/10 text-primary", bar: "bg-primary" },
  warning: { label: "75 % atteint", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", bar: "bg-amber-500" },
  alert: { label: "90 % atteint", badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400", bar: "bg-orange-500" },
  exceeded: { label: "Budget dépassé", badge: "bg-destructive/10 text-destructive", bar: "bg-destructive" },
};

export function BudgetCard({
  budget,
  currency,
  categories,
}: {
  budget: BudgetDTO;
  currency: Currency;
  categories: BudgetCategoryOption[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const status = STATUS_CONFIG[budget.status];
  const overspent = budget.remaining < 0;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <span
            className="flex size-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${budget.category.color}1a` }}
          >
            <CategoryIcon
              name={budget.category.icon}
              className="size-5"
              style={{ color: budget.category.color }}
            />
          </span>
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{budget.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {budget.category.name} · {budget.monthLabel}
            </p>
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label={`Modifier ${budget.name}`}
              title="Modifier"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label={`Supprimer ${budget.name}`}
              title="Supprimer"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {budget.percent.toFixed(1).replace(".", ",")} %
            </p>
            <Badge variant="secondary" className={cn("border-0", status.badge)}>
              {status.label}
            </Badge>
          </div>

          <Progress value={Math.min(budget.percent, 100)} aria-label={`${budget.percent} % utilisé`}>
            <ProgressTrack className="relative">
              <ProgressIndicator className={status.bar} />
              {BUDGET_THRESHOLDS.map((t) => (
                <span
                  key={t}
                  className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-background"
                  style={{ left: `${t}%` }}
                  aria-hidden="true"
                />
              ))}
            </ProgressTrack>
          </Progress>

          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Prévu</dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(budget.amountLimit, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Dépensé</dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(budget.spent, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Restant</dt>
              <dd
                className={cn(
                  "font-semibold tabular-nums",
                  overspent && "text-destructive",
                )}
              >
                {formatMoney(budget.remaining, currency)}
              </dd>
            </div>
          </dl>

          {overspent ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              Dépassement de {formatMoney(Math.abs(budget.remaining), currency)} — réduisez
              vos dépenses sur {budget.category.name}.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <BudgetFormDialog
        budget={budget}
        categories={categories}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteBudgetDialog budget={budget} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}
