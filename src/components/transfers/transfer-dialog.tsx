"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createTransferAction } from "@/app/actions/transfers";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Currency } from "@/lib/account-schemas";
import { formatMoney } from "@/lib/money";
import {
  createTransferSchema,
  type CreateTransferInput,
} from "@/lib/transfer-schemas";
import type { TransferAccountOption } from "@/lib/services/transfers";

type FormValues = CreateTransferInput;

export function TransferDialog({
  accounts,
  open,
  onOpenChange,
  defaultFromId,
}: {
  accounts: TransferAccountOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFromId?: string;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(createTransferSchema),
    defaultValues: {
      fromAccountId: defaultFromId ?? accounts[0]?.id ?? "",
      toAccountId: "",
      amount: 0,
      description: "",
    },
  });

  const fromId = watch("fromAccountId");
  const toId = watch("toAccountId");
  const amountValue = Number(watch("amount"));

  const source = accounts.find((a) => a.id === fromId) ?? null;
  // Un transfert n'a de sens qu'entre deux comptes de même devise
  // (aucune conversion appliquée : 1:1 silencieux interdit côté serveur).
  const destOptions = source
    ? accounts.filter((a) => a.id !== source.id && a.currency === source.currency)
    : [];
  const dest = accounts.find((a) => a.id === toId) ?? null;
  const sourceBalance = source ? Number(source.balance) : 0;
  const insufficient =
    !!source &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    amountValue > sourceBalance;

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    try {
      const result = await createTransferAction({
        ...values,
        description: values.description?.trim()
          ? values.description.trim()
          : undefined,
      });
      if (result.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
    } catch {
      setServerError("Une erreur inattendue est survenue. Veuillez réessayer.");
      toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      return;
    }
    const currency = (source?.currency ?? "MGA") as Currency;
    toast.success(
      `Transfert effectué : ${formatMoney(amountValue, currency)} de ${source?.name} vers ${dest?.name}.`,
    );
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4" aria-hidden="true" />
            Nouveau transfert
          </DialogTitle>
          <DialogDescription>
            Le compte source est débité et le compte destination est crédité
            dans une seule opération atomique. Un transfert n&apos;est ni une
            dépense ni un revenu.
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
            noValidate
          >
            <Field id="tf-from" label="Depuis" error={errors.fromAccountId}>
              <select
                id="tf-from"
                className={inputClassName}
                aria-invalid={!!errors.fromAccountId}
                {...register("fromAccountId", {
                  onChange: (e) => {
                    const nextId = e.target.value;
                    const nextSource = accounts.find((a) => a.id === nextId);
                    const currentDest = accounts.find(
                      (a) => a.id === getValues("toAccountId"),
                    );
                    if (
                      !currentDest ||
                      currentDest.id === nextId ||
                      (nextSource && currentDest.currency !== nextSource.currency)
                    ) {
                      setValue("toAccountId", "");
                    }
                  },
                })}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {formatMoney(a.balance, a.currency as Currency)}
                  </option>
                ))}
              </select>
            </Field>

            <Field id="tf-to" label="Vers" error={errors.toAccountId}>
              <select
                id="tf-to"
                className={inputClassName}
                aria-invalid={!!errors.toAccountId}
                {...register("toAccountId")}
              >
                <option value="">Sélectionner…</option>
                {destOptions.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} — {formatMoney(a.balance, a.currency as Currency)}
                  </option>
                ))}
              </select>
            </Field>
            {source && destOptions.length === 0 ? (
              <p role="alert" className="text-sm text-destructive">
                Aucun autre compte en {source.currency} : créez d&apos;abord un
                second compte dans la même devise.
              </p>
            ) : null}

            <Field
              id="tf-amount"
              label={`Montant${source ? ` (${source.currency})` : ""}`}
              error={errors.amount}
            >
              <input
                id="tf-amount"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                placeholder="500 000"
                className={inputClassName}
                aria-invalid={!!errors.amount || insufficient}
                {...register("amount")}
              />
            </Field>
            {source && !errors.amount ? (
              <p
                className={
                  insufficient
                    ? "text-sm text-destructive"
                    : "text-sm text-muted-foreground"
                }
                role={insufficient ? "alert" : "status"}
              >
                Disponible sur {source.name} :{" "}
                {formatMoney(source.balance, source.currency as Currency)}
                {insufficient ? " — montant supérieur au solde." : ""}
              </p>
            ) : null}

            <Field
              id="tf-description"
              label="Description (optionnel)"
              error={errors.description}
            >
              <input
                id="tf-description"
                type="text"
                placeholder={`Transfert ${source?.name ?? "A"} → ${dest?.name ?? "B"}`}
                autoComplete="off"
                className={inputClassName}
                aria-invalid={!!errors.description}
                {...register("description")}
              />
            </Field>

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
              <Button
                type="submit"
                disabled={
                  isSubmitting || insufficient || destOptions.length === 0
                }
              >
                {isSubmitting ? "Transfert…" : "Effectuer le transfert"}
              </Button>
            </div>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
