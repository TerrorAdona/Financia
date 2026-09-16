"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { createAccountAction, updateAccountAction } from "@/app/actions/accounts";
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
  ACCOUNT_TYPES,
  createAccountSchema,
  updateAccountSchema,
  type CreateAccountInput,
} from "@/lib/account-schemas";
import { ACCOUNT_TYPE_LABELS } from "@/lib/money";
import type { AccountDTO } from "@/lib/services/accounts";

type FormValues = CreateAccountInput;

function AccountForm({
  account,
  onDone,
}: {
  account?: AccountDTO | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!account;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateAccountSchema : createAccountSchema),
    defaultValues: {
      name: account?.name ?? "",
      type: account?.type ?? "CASH",
      // Devise unique du site : Ariary. Les éventuels anciens comptes
      // non-MGA sont normalisés à la prochaine modification (montants inchangés).
      currency: "MGA",
      balance: account ? Number(account.balance) : 0,
    },
  });

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const result = isEdit
      ? await updateAccountAction({ ...values, id: account.id })
      : await createAccountAction(values);
    if (result.error) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success(
      isEdit ? "Compte modifié avec succès." : "Compte créé avec succès.",
    );
    onDone();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field id="account-name" label="Nom du compte" error={errors.name}>
        <input
          id="account-name"
          type="text"
          placeholder="Ex. MVola, BNI Madagasikara"
          autoComplete="off"
          className={inputClassName}
          aria-invalid={!!errors.name}
          {...register("name")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="account-type" label="Type" error={errors.type}>
          <select
            id="account-type"
            className={inputClassName}
            aria-invalid={!!errors.type}
            {...register("type")}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </Field>

        <div>
          <p className="text-sm font-medium">Devise</p>
          <p className="mt-1 rounded-lg bg-muted px-3 py-2 text-sm">
            Ariary (Ar) — devise unique du site
          </p>
          <input type="hidden" {...register("currency")} />
        </div>
      </div>

      <Field
        id="account-balance"
        label={isEdit ? "Solde actuel" : "Solde initial"}
        error={errors.balance}
      >
        <input
          id="account-balance"
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          placeholder="0"
          className={inputClassName}
          aria-invalid={!!errors.balance}
          {...register("balance")}
        />
      </Field>

      <FormError message={serverError} />

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? isEdit
              ? "Enregistrement…"
              : "Création…"
            : isEdit
              ? "Enregistrer"
              : "Créer le compte"}
        </Button>
      </div>
    </form>
  );
}

export function AccountFormDialog({
  account,
  open,
  onOpenChange,
}: {
  /** Défini en mode édition, absent en mode création. */
  account?: AccountDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!account;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier le compte" : "Nouveau compte"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Mettez à jour les informations du compte."
              : "Créez un compte pour suivre son solde en Ariary."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <AccountForm
            key={account?.id ?? "new"}
            account={account}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
