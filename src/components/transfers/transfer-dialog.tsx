"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRightLeft, Search, UserRound, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, type UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";

import {
  createTransferAction,
  listRecipientAccountsAction,
  requestTransferAction,
  searchRecipientsAction,
} from "@/app/actions/transfers";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { Badge } from "@/components/ui/badge";
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
  requestTransferSchema,
  type CreateTransferInput,
  type RequestTransferInput,
} from "@/lib/transfer-schemas";
import type {
  RecipientAccountOption,
  RecipientOption,
  TransferAccountOption,
} from "@/lib/services/transfers";
import { cn } from "@/lib/utils";

type Mode = "self" | "person";

/* ------------------------------------------------------------------ */
/* Transfert instantané entre mes propres comptes (comportement actuel) */
/* ------------------------------------------------------------------ */

function SelfTransferForm({
  accounts,
  defaultFromId,
  onDone,
}: {
  accounts: TransferAccountOption[];
  defaultFromId?: string;
  onDone: () => void;
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
  } = useForm<CreateTransferInput>({
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

  const onSubmit = async (values: CreateTransferInput) => {
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
    onDone();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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

      <Field id="tf-to" label="Vers (mon compte)" error={errors.toAccountId}>
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

      <AmountField
        id="tf-amount"
        sourceCurrency={source?.currency ?? null}
        sourceName={source?.name ?? null}
        sourceBalance={source?.balance ?? null}
        errorsAmount={errors.amount}
        registerAmount={register("amount")}
        insufficient={insufficient}
      />

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
          onClick={onDone}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting || insufficient || destOptions.length === 0}
        >
          {isSubmitting ? "Transfert…" : "Effectuer le transfert"}
        </Button>
      </div>
    </form>
  );
}

function AmountField({
  id,
  sourceCurrency,
  sourceName,
  sourceBalance,
  errorsAmount,
  registerAmount,
  insufficient,
}: {
  id: string;
  sourceCurrency: string | null;
  sourceName: string | null;
  sourceBalance: string | null;
  errorsAmount: { message?: string } | undefined;
  registerAmount: UseFormRegisterReturn<"amount">;
  insufficient: boolean;
}) {
  return (
    <>
      <Field
        id={id}
        label={`Montant${sourceCurrency ? ` (${sourceCurrency})` : ""}`}
        error={errorsAmount}
      >
        <input
          id={id}
          type="number"
          min={0}
          step="0.01"
          inputMode="decimal"
          placeholder="500 000"
          className={inputClassName}
          aria-invalid={!!errorsAmount || insufficient}
          {...registerAmount}
        />
      </Field>
      {sourceName && sourceBalance && sourceCurrency && !errorsAmount ? (
        <p
          className={
            insufficient
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
          role={insufficient ? "alert" : "status"}
        >
          Disponible sur {sourceName} :{" "}
          {formatMoney(sourceBalance, sourceCurrency as Currency)}
          {insufficient ? " — montant supérieur au solde." : ""}
        </p>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Demande vers une autre personne (avec confirmation du destinataire)  */
/* ------------------------------------------------------------------ */

function PersonTransferForm({
  accounts,
  onDone,
}: {
  accounts: TransferAccountOption[];
  onDone: () => void;
}) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RecipientOption[]>([]);
  const [searched, setSearched] = useState(false);
  const [recipient, setRecipient] = useState<RecipientOption | null>(null);
  const [destAccounts, setDestAccounts] = useState<RecipientAccountOption[]>([]);
  const [loadingDest, setLoadingDest] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RequestTransferInput>({
    resolver: zodResolver(requestTransferSchema),
    defaultValues: {
      fromAccountId: accounts[0]?.id ?? "",
      toAccountId: "",
      amount: 0,
      description: "",
    },
  });

  // Recherche débouncée du destinataire (nom ou email).
  useEffect(() => {
    const q = query.trim();
    if (recipient || q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setSearching(true);
    const timer = setTimeout(() => {
      void searchRecipientsAction(q).then((res) => {
        setSearching(false);
        setSearched(true);
        if (res.error || !res.data) {
          toast.error(res.error ?? "Recherche impossible.");
          setResults([]);
          return;
        }
        setResults(res.data);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, recipient]);

  const pickRecipient = async (r: RecipientOption) => {
    setRecipient(r);
    setResults([]);
    setSearched(false);
    setValue("toAccountId", "");
    setLoadingDest(true);
    const res = await listRecipientAccountsAction(r.id);
    setLoadingDest(false);
    if (res.error || !res.data) {
      toast.error(res.error ?? "Comptes du destinataire inaccessibles.");
      setDestAccounts([]);
      return;
    }
    setDestAccounts(res.data);
    if (res.data.length === 0) {
      toast.error(`${recipientName(r)} n'a aucun compte actif.`);
    }
  };

  const clearRecipient = () => {
    setRecipient(null);
    setQuery("");
    setDestAccounts([]);
    setValue("toAccountId", "");
  };

  const fromId = watch("fromAccountId");
  const toId = watch("toAccountId");
  const amountValue = Number(watch("amount"));

  const dest = destAccounts.find((a) => a.id === toId) ?? null;
  const sourceOptions = dest
    ? accounts.filter((a) => a.currency === dest.currency)
    : accounts;
  const source = accounts.find((a) => a.id === fromId) ?? null;
  const currencyMismatch =
    !!source && !!dest && source.currency !== dest.currency;
  const sourceBalance = source ? Number(source.balance) : 0;
  const insufficient =
    !!source &&
    !currencyMismatch &&
    Number.isFinite(amountValue) &&
    amountValue > 0 &&
    amountValue > sourceBalance;

  const onSubmit = async (values: RequestTransferInput) => {
    if (!recipient) {
      setServerError("Sélectionnez d'abord un destinataire.");
      return;
    }
    setServerError(null);
    try {
      const result = await requestTransferAction({
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
    toast.success(
      `Demande envoyée à ${recipientName(recipient)} — le transfert sera exécuté dès sa confirmation.`,
    );
    onDone();
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {/* Étape 1 : destinataire */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="tf-recipient" className="text-sm font-medium">
          Destinataire (nom ou email)
        </label>
        {recipient ? (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 py-1.5 pr-1.5">
              <UserRound className="size-3.5" aria-hidden="true" />
              {recipientName(recipient)}
              <button
                type="button"
                onClick={clearRecipient}
                aria-label="Changer de destinataire"
                className="flex size-5 items-center justify-center rounded-full hover:bg-muted-foreground/20"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            </Badge>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                id="tf-recipient"
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex. Aina Rakoto ou aina@exemple.mg"
                autoComplete="off"
                className={cn(inputClassName, "pl-9")}
                aria-describedby="tf-recipient-hint"
              />
            </div>
            <p id="tf-recipient-hint" className="text-xs text-muted-foreground">
              Tapez au moins 2 caractères. Le destinataire recevra une
              notification et devra confirmer.
            </p>
            {searching ? (
              <p className="text-sm text-muted-foreground" role="status">
                Recherche…
              </p>
            ) : null}
            {!searching && searched && results.length === 0 ? (
              <p className="text-sm text-muted-foreground" role="status">
                Aucun utilisateur trouvé avec un compte actif.
              </p>
            ) : null}
            {results.length > 0 ? (
              <ul
                className="flex max-h-40 flex-col gap-1 overflow-y-auto rounded-lg border p-1"
                aria-label="Destinataires trouvés"
              >
                {results.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => void pickRecipient(r)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                    >
                      <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">
                          {r.name?.trim() ? r.name : r.email}
                        </span>
                        {r.name?.trim() ? (
                          <span className="block truncate text-xs text-muted-foreground">
                            {r.email}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </div>

      {/* Étape 2 : compte du destinataire */}
      {recipient ? (
        <Field
          id="tf-dest-account"
          label={`Compte de ${recipientName(recipient)}`}
          error={errors.toAccountId}
        >
          <select
            id="tf-dest-account"
            className={inputClassName}
            aria-invalid={!!errors.toAccountId}
            disabled={loadingDest}
            {...register("toAccountId", {
              onChange: (e) => {
                const nextDest = destAccounts.find((a) => a.id === e.target.value);
                const currentSource = accounts.find(
                  (a) => a.id === getValues("fromAccountId"),
                );
                if (
                  nextDest &&
                  currentSource &&
                  currentSource.currency !== nextDest.currency
                ) {
                  const firstCompatible = accounts.find(
                    (a) => a.currency === nextDest.currency,
                  );
                  setValue("fromAccountId", firstCompatible?.id ?? "");
                }
              },
            })}
          >
            <option value="">
              {loadingDest ? "Chargement…" : "Sélectionner…"}
            </option>
            {destAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.currency})
              </option>
            ))}
          </select>
        </Field>
      ) : null}

      {/* Depuis : mes comptes dans la même devise */}
      <Field id="tf-from-ext" label="Depuis (mon compte)" error={errors.fromAccountId}>
        <select
          id="tf-from-ext"
          className={inputClassName}
          aria-invalid={!!errors.fromAccountId}
          {...register("fromAccountId")}
        >
          {sourceOptions.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {formatMoney(a.balance, a.currency as Currency)}
            </option>
          ))}
        </select>
      </Field>
      {currencyMismatch ? (
        <p role="alert" className="text-sm text-destructive">
          Les deux comptes doivent avoir la même devise ({dest?.currency}).
        </p>
      ) : null}

      <AmountField
        id="tf-amount-ext"
        sourceCurrency={source?.currency ?? null}
        sourceName={source?.name ?? null}
        sourceBalance={source?.balance ?? null}
        errorsAmount={errors.amount}
        registerAmount={register("amount")}
        insufficient={insufficient}
      />

      <Field
        id="tf-description-ext"
        label="Description (optionnel)"
        error={errors.description}
      >
        <input
          id="tf-description-ext"
          type="text"
          placeholder="Ex. Remboursement déjeuner"
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
          onClick={onDone}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !recipient ||
            !dest ||
            currencyMismatch ||
            insufficient ||
            sourceOptions.length === 0
          }
        >
          {isSubmitting ? "Envoi…" : "Envoyer la demande"}
        </Button>
      </div>
    </form>
  );
}

function recipientName(r: RecipientOption): string {
  return r.name?.trim() ? r.name.trim() : r.email;
}

/* ------------------------------------------------------------------ */

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
  const [mode, setMode] = useState<Mode>("self");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4" aria-hidden="true" />
            Nouveau transfert
          </DialogTitle>
          <DialogDescription>
            {mode === "self"
              ? "Le compte source est débité et le compte destination est crédité dans une seule opération atomique. Un transfert n'est ni une dépense ni un revenu."
              : "Le destinataire reçoit une notification et doit confirmer : les fonds ne bougent qu'à son acceptation."}
          </DialogDescription>
        </DialogHeader>
        <div
          className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1"
          role="tablist"
          aria-label="Type de transfert"
        >
          {(
            [
              { key: "self", label: "Mes comptes" },
              { key: "person", label: "Une personne" },
            ] as Array<{ key: Mode; label: string }>
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={mode === t.key}
              onClick={() => setMode(t.key)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                mode === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        {open ? (
          mode === "self" ? (
            <SelfTransferForm
              key="self"
              accounts={accounts}
              defaultFromId={defaultFromId}
              onDone={() => onOpenChange(false)}
            />
          ) : (
            <PersonTransferForm
              key="person"
              accounts={accounts}
              onDone={() => onOpenChange(false)}
            />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
