"use client";

import { Plus, Target } from "lucide-react";
import { useState } from "react";

import { GoalCard } from "@/components/goals/goal-card";
import { GoalFormDialog } from "@/components/goals/goal-form-dialog";
import { Button } from "@/components/ui/button";
import type { Currency } from "@/lib/account-schemas";
import type { GoalDTO } from "@/lib/services/goals";

export function GoalsPageClient({
  goals,
  currency,
}: {
  goals: GoalDTO[];
  currency: Currency;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const active = goals.filter((g) => g.status === "ACTIVE" || g.status === "OVERDUE");
  const done = goals.filter((g) => g.status === "COMPLETED" || g.status === "EXCEEDED");

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Objectifs</h1>
          <p className="text-muted-foreground">
            {goals.length === 0
              ? "Aucun objectif pour le moment."
              : `${active.length} en cours · ${done.length} atteint(s).`}
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nouvel objectif
        </Button>
      </div>

      {goals.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Target className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Aucun objectif</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Créez votre premier objectif d&apos;épargne (ordinateur, moto,
              fonds d&apos;urgence…) et suivez votre progression.
            </p>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Créer un objectif
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} currency={currency} />
          ))}
        </div>
      )}

      <GoalFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}
