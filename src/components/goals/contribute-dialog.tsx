"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { contributeGoalAction } from "@/app/actions/goals";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  contributeGoalSchema,
  type ContributeGoalInput,
} from "@/lib/goal-schemas";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/account-schemas";
import type { GoalDTO } from "@/lib/services/goals";
import { cn } from "@/lib/utils";

const PRESETS = [10000, 50000, 100000, 500000];

export function ContributeDialog({
  goal,
  currency,
  open,
  onOpenChange,
}: {
  goal: GoalDTO | null;
  currency: Currency;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ContributeGoalInput>({
    resolver: zodResolver(contributeGoalSchema),
    defaultValues: { id: goal?.id ?? "", amount: 0 },
  });

  const amount = watch("amount") ?? 0;
  const preview =
    goal && Number.isFinite(Number(amount))
      ? Number(goal.currentAmount) + Number(amount)
      : null;

  const onSubmit = async (values: ContributeGoalInput) => {
    if (!goal) return;
    setServerError(null);
    try {
      const result = await contributeGoalAction({ id: goal.id, amount: values.amount });
      if (result.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data && Number(result.data.currentAmount) >= Number(result.data.targetAmount)
          ? "Objectif atteint, bravo !"
          : "Contribution ajoutée avec succès.",
      );
      onOpenChange(false);
      router.refresh();
    } catch {
      setServerError("Une erreur inattendue est survenue. Veuillez réessayer.");
      toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (goal) setValue("id", goal.id);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Contribuer : {goal?.name}</DialogTitle>
          <DialogDescription>
            Épargne actuelle : {goal ? formatMoney(goal.currentAmount, currency) : "—"} sur{" "}
            {goal ? formatMoney(goal.targetAmount, currency) : "—"}.
          </DialogDescription>
        </DialogHeader>
        {open && goal ? (
          <form
            key={goal.id}
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <div className="flex flex-wrap gap-2" aria-label="Montants rapides">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setValue("amount", p, { shouldValidate: true })}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm tabular-nums transition-colors hover:bg-muted",
                    Number(amount) === p && "border-primary bg-primary/10 font-medium",
                  )}
                >
                  {formatMoney(p, currency)}
                </button>
              ))}
            </div>

            <Field id="contrib-amount" label="Montant de la contribution" error={errors.amount}>
              <input
                id="contrib-amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="0"
                autoFocus
                className={inputClassName}
                aria-invalid={!!errors.amount}
                {...register("amount")}
              />
            </Field>

            {preview !== null && preview >= 0 ? (
              <p className="text-sm text-muted-foreground" role="status">
                Nouveau total :{" "}
                <span className="font-semibold tabular-nums text-foreground">
                  {formatMoney(preview, currency)}
                </span>
              </p>
            ) : null}

            <FormError message={serverError} />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Ajout…" : "Ajouter"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
