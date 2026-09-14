"use client";

import { Plus, Tags, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";

import { CategoryCard } from "@/components/categories/category-card";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { Button } from "@/components/ui/button";
import type { CategoryDTO } from "@/lib/services/categories";

export function CategoriesPageClient({
  categories,
}: {
  categories: CategoryDTO[];
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const incomes = categories.filter((c) => c.type === "INCOME");
  const expenses = categories.filter((c) => c.type === "EXPENSE");

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Catégories</h1>
          <p className="text-muted-foreground">
            {categories.length === 0
              ? "Aucune catégorie pour le moment."
              : `${incomes.length} revenu(s) · ${expenses.length} dépense(s).`}
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" aria-hidden="true" />
          Nouvelle catégorie
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Tags className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Aucune catégorie</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Créez votre première catégorie de revenu ou de dépense pour
              organiser vos transactions.
            </p>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Créer une catégorie
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <TrendingUp className="size-4" aria-hidden="true" />
              Revenus ({incomes.length})
            </h2>
            {incomes.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              <TrendingDown className="size-4" aria-hidden="true" />
              Dépenses ({expenses.length})
            </h2>
            {expenses.map((category) => (
              <CategoryCard key={category.id} category={category} />
            ))}
          </div>
        </div>
      )}

      <CategoryFormDialog open={createOpen} onOpenChange={setCreateOpen} />
    </section>
  );
}
