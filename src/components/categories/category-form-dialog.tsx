"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createCategoryAction, updateCategoryAction } from "@/app/actions/categories";
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
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_TYPES,
  createCategorySchema,
  updateCategorySchema,
  type CreateCategoryInput,
} from "@/lib/category-schemas";
import type { CategoryDTO } from "@/lib/services/categories";
import { cn } from "@/lib/utils";

type FormValues = CreateCategoryInput;

function CategoryForm({
  category,
  onDone,
}: {
  category?: CategoryDTO | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!category;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateCategorySchema : createCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      type: category?.type ?? "EXPENSE",
      icon: (category?.icon as FormValues["icon"]) ?? "Tag",
      color: category?.color ?? "#64748b",
    },
  });

  const selectedColor = watch("color");
  const selectedIcon = watch("icon");

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = isEdit
      ? await updateCategoryAction({ ...values, id: category.id })
      : await createCategoryAction(values);
    if (result.error) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(
      isEdit ? "Catégorie modifiée avec succès." : "Catégorie créée avec succès.",
    );
    onDone();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="category-name" label="Nom" error={errors.name}>
          <input
            id="category-name"
            type="text"
            placeholder="Ex. Cantine scolaire"
            autoComplete="off"
            className={inputClassName}
            aria-invalid={!!errors.name}
            {...register("name")}
          />
        </Field>

        <Field id="category-type" label="Type" error={errors.type}>
          <select
            id="category-type"
            className={inputClassName}
            aria-invalid={!!errors.type}
            {...register("type")}
          >
            {CATEGORY_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "INCOME" ? "Revenu" : "Dépense"}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field id="category-icon" label="Icône" error={errors.icon}>
        <div className="flex items-center gap-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <CategoryIcon name={selectedIcon} className="size-5 text-muted-foreground" />
          </span>
          <select
            id="category-icon"
            className={inputClassName}
            aria-invalid={!!errors.icon}
            {...register("icon")}
          >
            {CATEGORY_ICONS.map((icon) => (
              <option key={icon} value={icon}>
                {icon}
              </option>
            ))}
          </select>
        </div>
      </Field>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Couleur</span>
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Couleur">
          {CATEGORY_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              role="radio"
              aria-checked={selectedColor === color}
              aria-label={color}
              title={color}
              onClick={() => setValue("color", color, { shouldValidate: true })}
              className={cn(
                "size-8 rounded-full border-2 transition-transform",
                selectedColor === color
                  ? "scale-110 border-foreground"
                  : "border-transparent hover:scale-105",
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        {errors.color?.message ? (
          <p role="alert" className="text-sm text-destructive">
            {errors.color.message}
          </p>
        ) : null}
      </div>

      <FormError message={serverError} />

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={isSubmitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEdit
              ? "Enregistrement…"
              : "Création…"
            : isEdit
              ? "Enregistrer"
              : "Créer la catégorie"}
        </Button>
      </div>
    </form>
  );
}

export function CategoryFormDialog({
  category,
  open,
  onOpenChange,
}: {
  category?: CategoryDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!category;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la catégorie" : "Nouvelle catégorie"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour le nom, le type, l'icône ou la couleur."
              : "Créez une catégorie de revenu ou de dépense."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <CategoryForm
            key={category?.id ?? "new"}
            category={category}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
