"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  createTransactionAction,
  updateTransactionAction,
} from "@/app/actions/transactions";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toInputDateValue, todayInputValue } from "@/lib/dates";
import { TRANSACTION_TYPE_LABELS } from "@/lib/transaction-schemas";
import {
  createTransactionSchema,
  updateTransactionSchema,
  type CreateTransactionInput,
} from "@/lib/transaction-schemas";
import type {
  TransactionKind,
  TransactionListItem,
} from "@/lib/services/transactions";

export type TransactionFormData = {
  accounts: Array<{ id: string; name: string; currency: string; balance: string }>;
  categories: Array<{
    id: string;
    name: string;
    type: TransactionKind;
    color: string;
    icon: string;
  }>;
};

type FormValues = CreateTransactionInput;

const TYPE_ORDER: TransactionKind[] = ["EXPENSE", "INCOME", "TRANSFER"];

function TransactionForm({
  transaction,
  formData,
  onDone,
}: {
  transaction?: TransactionListItem | null;
  formData: TransactionFormData;
  onDone: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEdit = !!transaction;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(isEdit ? updateTransactionSchema : createTransactionSchema),
    defaultValues: {
      description: transaction?.description ?? "",
      amount: transaction ? Number(transaction.amount) : 0,
      type: transaction?.type ?? "EXPENSE",
      accountId: transaction?.account.id ?? formData.accounts[0]?.id ?? "",
      categoryId: transaction?.category?.id ?? "",
      toAccountId: transaction?.toAccount?.id ?? "",
      date: transaction ? toInputDateValue(transaction.date) : todayInputValue(),
      note: transaction?.note ?? "",
    },
  });

  const selectedType = watch("type");
  const categoriesForType = formData.categories.filter(
    (c) => selectedType !== "TRANSFER" && c.type === selectedType,
  );

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const payload = {
      ...values,
      categoryId: values.type === "TRANSFER" ? null : values.categoryId || null,
      toAccountId: values.type === "TRANSFER" ? values.toAccountId || null : null,
      note: values.note?.trim() ? values.note.trim() : null,
    };
    try {
      const result = isEdit
        ? await updateTransactionAction({ ...payload, id: transaction.id })
        : await createTransactionAction(payload);
      if (result.error) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
    } catch {
      // Filet de sécurité : une action qui rejette ne doit jamais être silencieuse.
      setServerError("Une erreur inattendue est survenue. Veuillez réessayer.");
      toast.error("Une erreur inattendue est survenue. Veuillez réessayer.");
      return;
    }
    toast.success(
      isEdit ? "Transaction modifiée avec succès." : "Transaction créée avec succès.",
    );
    onDone();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field id="tx-type" label="Type" error={errors.type}>
        <select
          id="tx-type"
          className={inputClassName}
          aria-invalid={!!errors.type}
          {...register("type", {
            onChange: (e) => {
              const next = e.target.value as TransactionKind;
              if (next === "TRANSFER") setValue("categoryId", "");
              else setValue("toAccountId", "");
            },
          })}
        >
          {TYPE_ORDER.map((t) => (
            <option key={t} value={t}>
              {TRANSACTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>

      <Field id="tx-description" label="Description" error={errors.description}>
        <input
          id="tx-description"
          type="text"
          placeholder="Ex. Marché d'Analakely"
          autoComplete="off"
          className={inputClassName}
          aria-invalid={!!errors.description}
          {...register("description")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="tx-amount" label="Montant" error={errors.amount}>
          <input
            id="tx-amount"
            type="number"
            min={0}
            step="0.01"
            inputMode="decimal"
            placeholder="0"
            className={inputClassName}
            aria-invalid={!!errors.amount}
            {...register("amount")}
          />
        </Field>

        <Field id="tx-date" label="Date" error={errors.date}>
          <input
            id="tx-date"
            type="date"
            className={inputClassName}
            aria-invalid={!!errors.date}
            {...register("date")}
          />
        </Field>
      </div>

      <Field id="tx-account" label="Compte" error={errors.accountId}>
        <select
          id="tx-account"
          className={inputClassName}
          aria-invalid={!!errors.accountId}
          {...register("accountId")}
        >
          {formData.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.currency})
            </option>
          ))}
        </select>
      </Field>

      {selectedType === "TRANSFER" ? (
        <Field
          id="tx-toAccount"
          label="Compte destinataire"
          error={errors.toAccountId}
        >
          <select
            id="tx-toAccount"
            className={inputClassName}
            aria-invalid={!!errors.toAccountId}
            {...register("toAccountId")}
          >
            <option value="">Sélectionner…</option>
            {formData.accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field id="tx-category" label="Catégorie" error={errors.categoryId}>
          <select
            id="tx-category"
            className={inputClassName}
            aria-invalid={!!errors.categoryId}
            {...register("categoryId")}
          >
            <option value="">Sélectionner…</option>
            {categoriesForType.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field id="tx-note" label="Note (optionnel)" error={errors.note}>
        <textarea
          id="tx-note"
          rows={2}
          placeholder="Détails supplémentaires…"
          className={`${inputClassName} h-auto min-h-16`}
          aria-invalid={!!errors.note}
          {...register("note")}
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
              : "Créer la transaction"}
        </Button>
      </div>
    </form>
  );
}

export function TransactionFormDialog({
  transaction,
  formData,
  open,
  onOpenChange,
}: {
  transaction?: TransactionListItem | null;
  formData: TransactionFormData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isEdit = !!transaction;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Modifier la transaction" : "Nouvelle transaction"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Les soldes des comptes seront recalculés automatiquement."
              : "Le solde du compte sera mis à jour automatiquement."}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <TransactionForm
            key={transaction?.id ?? "new"}
            transaction={transaction}
            formData={formData}
            onDone={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
