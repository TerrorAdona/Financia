"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";

import { createGoalAction, updateGoalAction } from "@/app/actions/goals";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toInputDateValue } from "@/lib/dates";
import {
  createGoalSchema,
  updateGoalSchema,
  type CreateGoalInput,
} from "@/lib/goal-schemas";
import type { GoalDTO } from "@/lib/services/goals";

/** Valeurs du formulaire : la date reste une chaîne "AAAA-MM-JJ" (input date). */
type FormValues = Omit<CreateGoalInput, "deadline"> & { deadline: string };

function GoalForm({
  goal,
  onDone,
}: {
  goal?: GoalDTO | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!goal;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(
      isEdit ? updateGoalSchema : createGoalSchema,
    ) as unknown as Resolver<FormValues>,
    defaultValues: {
      name: goal?.name ?? "",
      description: goal?.description ?? "",
      targetAmount: goal ? Number(goal.targetAmount) : 0,
      currentAmount: goal ? Number(goal.currentAmount) : 0,
      deadline: goal?.deadline ? toInputDateValue(goal.deadline) : "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const payload = {
      ...values,
      // Le schéma serveur convertit "AAAA-MM-JJ" en Date (z.coerce.date).
      deadline: values.deadline as unknown as Date,
      description: values.description?.trim() ? values.description.trim() : null,
    };
    const result = isEdit
      ? await updateGoalAction({ ...payload, id: goal.id })
      : await createGoalAction(payload);
    if (result.error) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(
      isEdit ? "Objectif modifié avec succès." : "Objectif créé avec succès.",
    );
    onDone();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field id="goal-name" label="Nom" error={errors.name}>
        <input
          id="goal-name"
          type="text"
          placeholder="Ex. Ordinateur"
          autoComplete="off"
          className={inputClassName}
          aria-invalid={!!errors.name}
          {...register("name")}
        />
      </Field>

      <Field id="goal-description" label="Description (optionnel)" error={errors.description}>
        <textarea
          id="goal-description"
          rows={2}
          placeholder="Ex. Ordinateur portable pour le travail"
          className={`${inputClassName} h-auto min-h-16`}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="goal-target" label="Montant cible" error={errors.targetAmount}>
          <input
            id="goal-target"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="4000000"
            className={inputClassName}
            aria-invalid={!!errors.targetAmount}
            {...register("targetAmount")}
          />
        </Field>

        <Field
          id="goal-current"
          label={isEdit ? "Montant actuel" : "Épargne initiale"}
          error={errors.currentAmount}
        >
          <input
            id="goal-current"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0"
            className={inputClassName}
            aria-invalid={!!errors.currentAmount}
            {...register("currentAmount")}
          />
        </Field>
      </div>

      <Field id="goal-deadline" label="Date cible" error={errors.deadline}>
        <input
          id="goal-deadline"
          type="date"
          className={inputClassName}
          aria-invalid={!!errors.deadline}
          {...register("deadline")}
        />
      </Field>

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
              : "Créer l'objectif"}
        </Button>
      </div>
    </form>
  );
}

export function GoalFormDialog({
  goal,
  open,
  onOpenChange,
}: {
  goal?: GoalDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!goal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier l'objectif" : "Nouvel objectif"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "La progression et le statut seront recalculés."
              : "Définissez un montant cible et une date pour votre épargne."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <GoalForm
            key={goal?.id ?? "new"}
            goal={goal}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
