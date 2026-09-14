"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";

import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { CategoryIcon } from "@/components/categories/category-icon";
import { DeleteCategoryDialog } from "@/components/categories/delete-category-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CATEGORY_TYPE_LABELS } from "@/lib/category-schemas";
import type { CategoryDTO } from "@/lib/services/categories";

export function CategoryCard({ category }: { category: CategoryDTO }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const linked = category.transactionCount + category.budgetCount;

  return (
    <>
      <div className="flex items-center gap-3 rounded-xl border bg-card p-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${category.color}1a` }}
        >
          <CategoryIcon
            name={category.icon}
            className="size-5"
            style={{ color: category.color }}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{category.name}</p>
          <p className="text-xs text-muted-foreground">
            {linked === 0
              ? "Non utilisée"
              : `${category.transactionCount} transaction(s) · ${category.budgetCount} budget(s)`}
          </p>
        </div>
        <Badge variant={category.type === "INCOME" ? "default" : "secondary"}>
          {CATEGORY_TYPE_LABELS[category.type]}
        </Badge>
        <div className="flex shrink-0 items-center">
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={`Modifier ${category.name}`}
            title="Modifier"
            onClick={() => setEditOpen(true)}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            aria-label={`Supprimer ${category.name}`}
            title="Supprimer"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <CategoryFormDialog
        category={category}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteCategoryDialog
        category={category}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}
