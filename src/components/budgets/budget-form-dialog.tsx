"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createBudgetAction, updateBudgetAction } from "@/app/actions/budgets";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { CategoryIcon } from "@/components/categories/category-icon";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createBudgetSchema,
  currentMonth,
  editBudgetSchema,
  type CreateBudgetInput,
} from "@/lib/budget-schemas";
import type { BudgetDTO } from "@/lib/services/budgets";

export type BudgetCategoryOption = {
  id: string;
  name: string;
  color: string;
  icon: string;
};

type FormValues = CreateBudgetInput;

function BudgetForm({
  budget,
  categories,
  defaultMonth,
  onDone,
}: {
  budget?: BudgetDTO | null;
  categories: BudgetCategoryOption[];
  defaultMonth: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!budget;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    // En édition : règles `update` sans le `id` (voir editBudgetSchema).
    resolver: zodResolver(isEdit ? editBudgetSchema : createBudgetSchema),
    defaultValues: {
      name: budget?.name ?? "",
      categoryId: budget?.category.id ?? categories[0]?.id ?? "",
      month: budget?.month ?? defaultMonth,
      amountLimit: budget ? Number(budget.amountLimit) : 0,
    },
  });

  const selectedCategoryId = watch("categoryId");
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = isEdit
      ? await updateBudgetAction({ ...values, id: budget.id })
      : await createBudgetAction(values);
    if (result.error) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(
      isEdit ? "Budget modifié avec succès." : "Budget créé avec succès.",
    );
    onDone();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field id="budget-name" label="Nom du budget" error={errors.name}>
        <input
          id="budget-name"
          type="text"
          placeholder="Ex. Alimentation — septembre"
          autoComplete="off"
          className={inputClassName}
          aria-invalid={!!errors.name}
          {...register("name")}
        />
      </Field>

      <Field id="budget-category" label="Catégorie de dépense" error={errors.categoryId}>
        <div className="flex items-center gap-2">
          {selectedCategory ? (
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${selectedCategory.color}1a` }}
            >
              <CategoryIcon
                name={selectedCategory.icon}
                className="size-5"
                style={{ color: selectedCategory.color }}
              />
            </span>
          ) : null}
          <select
            id="budget-category"
            className={inputClassName}
            aria-invalid={!!errors.categoryId}
            {...register("categoryId")}
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="budget-month" label="Mois" error={errors.month}>
          <input
            id="budget-month"
            type="month"
            className={inputClassName}
            aria-invalid={!!errors.month}
            {...register("month")}
          />
        </Field>

        <Field id="budget-limit" label="Montant prévu" error={errors.amountLimit}>
          <input
            id="budget-limit"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="500000"
            className={inputClassName}
            aria-invalid={!!errors.amountLimit}
            {...register("amountLimit")}
          />
        </Field>
      </div>

      {categories.length === 0 ? (
        <p role="note" className="rounded-lg border px-3 py-2 text-sm text-muted-foreground">
          Aucune catégorie de dépense.{" "}
          <a href="/categories" className="font-medium text-primary underline-offset-4 hover:underline">
            Créez-en une
          </a>{" "}
          pour pouvoir budgéter.
        </p>
      ) : null}

      <FormError message={serverError} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting || categories.length === 0}>
          {isSubmitting
            ? isEdit
              ? "Enregistrement…"
              : "Création…"
            : isEdit
              ? "Enregistrer"
              : "Créer le budget"}
        </Button>
      </div>
    </form>
  );
}

export function BudgetFormDialog({
  budget,
  categories,
  defaultMonth,
  open,
  onOpenChange,
}: {
  budget?: BudgetDTO | null;
  categories: BudgetCategoryOption[];
  defaultMonth?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!budget;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le budget" : "Nouveau budget"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Les seuils d'alerte seront recalculés automatiquement."
              : "Un budget mensuel est lié à une catégorie de dépense."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <BudgetForm
            key={budget?.id ?? "new"}
            budget={budget}
            categories={categories}
            defaultMonth={defaultMonth ?? currentMonth()}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
