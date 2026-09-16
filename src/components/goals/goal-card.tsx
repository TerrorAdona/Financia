"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { ContributeDialog } from "@/components/goals/contribute-dialog";
import { DeleteGoalDialog } from "@/components/goals/delete-goal-dialog";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/account-schemas";
import type { GoalDTO, GoalStatus } from "@/lib/services/goals";
import { cn } from "@/lib/utils";

const STATUS_CONFIG: Record<GoalStatus, { label: string; badge: string; bar: string }> = {
  ACTIVE: { label: "En cours", badge: "bg-primary/10 text-primary", bar: "bg-primary" },
  COMPLETED: { label: "Atteint", badge: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
  EXCEEDED: { label: "Dépassé", badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400", bar: "bg-amber-500" },
  OVERDUE: { label: "Date dépassée", badge: "bg-destructive/10 text-destructive", bar: "bg-destructive" },
};

function deadlineLabel(goal: GoalDTO): string | null {
  if (!goal.deadline) return null;
  if (goal.status === "COMPLETED" || goal.status === "EXCEEDED") {
    return `Échéance : ${formatShortDate(goal.deadline)}`;
  }
  if (goal.daysLeft === null) return null;
  if (goal.daysLeft < 0) {
    const n = Math.abs(goal.daysLeft);
    return `Dépassée de ${n} jour${n > 1 ? "s" : ""}`;
  }
  if (goal.daysLeft === 0) return "Échéance aujourd'hui";
  return `J-${goal.daysLeft} · ${formatShortDate(goal.deadline)}`;
}

export function GoalCard({
  goal,
  currency,
}: {
  goal: GoalDTO;
  currency: Currency;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [contributeOpen, setContributeOpen] = useState(false);
  const status = STATUS_CONFIG[goal.status];
  const dateInfo = deadlineLabel(goal);

  return (
    <>
      <Card className="flex flex-col">
        <CardHeader className="flex flex-row items-center gap-3 space-y-0">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{goal.name}</CardTitle>
            {goal.description ? (
              <p className="truncate text-xs text-muted-foreground">{goal.description}</p>
            ) : null}
          </div>
          <Badge variant="secondary" className={cn("shrink-0 border-0", status.badge)}>
            {status.label}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3">
          <div className="flex items-end justify-between">
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {goal.percent.toFixed(1).replace(".", ",")} %
            </p>
            <p className="text-sm tabular-nums text-muted-foreground">
              {formatMoney(goal.currentAmount, currency)} / {formatMoney(goal.targetAmount, currency)}
            </p>
          </div>

          <Progress value={Math.min(goal.percent, 100)} aria-label={`${goal.percent} % épargnés`}>
            <ProgressTrack>
              <ProgressIndicator className={status.bar} />
            </ProgressTrack>
          </Progress>

          <div className="flex items-center justify-between text-sm">
            <p className="text-muted-foreground">
              {goal.status === "EXCEEDED" ? (
                <span className="font-medium text-amber-700 dark:text-amber-400">
                  +{formatMoney(Math.abs(goal.remaining), currency)} au-delà de l&apos;objectif
                </span>
              ) : goal.remaining > 0 ? (
                <>Reste {formatMoney(goal.remaining, currency)}</>
              ) : (
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  Objectif atteint !
                </span>
              )}
            </p>
            {dateInfo ? <p className="shrink-0 text-xs text-muted-foreground">{dateInfo}</p> : null}
          </div>

          <div className="mt-auto flex items-center justify-between pt-1">
            <Button type="button" size="sm" onClick={() => setContributeOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Contribuer
            </Button>
            <div className="flex items-center">
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`Modifier ${goal.name}`}
                title="Modifier"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                type="button"
                aria-label={`Supprimer ${goal.name}`}
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

      <GoalFormDialog goal={goal} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteGoalDialog goal={goal} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <ContributeDialog goal={goal} currency={currency} open={contributeOpen} onOpenChange={setContributeOpen} />
    </>
  );
}
