"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";

import { inputClassName } from "@/components/auth/form-fields";
import { Button } from "@/components/ui/button";
import {
  TRANSACTION_SORTS,
  TRANSACTION_TYPES,
  TRANSACTION_TYPE_LABELS,
  type TransactionSort,
} from "@/lib/transaction-schemas";

export type FilterOptions = {
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string; type: string }>;
};

export type FilterValues = {
  q: string;
  type?: string;
  categoryId?: string;
  accountId?: string;
  from?: string;
  to?: string;
  sort: TransactionSort;
};

const SORT_LABELS: Record<TransactionSort, string> = {
  date_desc: "Date (récent)",
  date_asc: "Date (ancien)",
  amount_desc: "Montant (décroissant)",
  amount_asc: "Montant (croissant)",
};

export function TransactionFilters({
  options,
  initial,
}: {
  options: FilterOptions;
  initial: FilterValues;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initial.q);

  const update = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete("page");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  };

  useEffect(() => {
    if (q === initial.q) return;
    const timer = setTimeout(() => update({ q: q.trim() || undefined }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const hasActiveFilters =
    !!initial.q ||
    !!initial.type ||
    !!initial.categoryId ||
    !!initial.accountId ||
    !!initial.from ||
    !!initial.to;

  const reset = () => {
    setQ("");
    router.replace(pathname);
  };

  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher (description, note)…"
          aria-label="Rechercher"
          className={inputClassName}
        />
        <select
          value={initial.type ?? ""}
          onChange={(e) => update({ type: e.target.value || undefined })}
          aria-label="Filtrer par type"
          className={inputClassName}
        >
          <option value="">Tous les types</option>
          {TRANSACTION_TYPES.map((t) => (
            <option key={t} value={t}>
              {TRANSACTION_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
        <select
          value={initial.categoryId ?? ""}
          onChange={(e) => update({ categoryId: e.target.value || undefined })}
          aria-label="Filtrer par catégorie"
          className={inputClassName}
        >
          <option value="">Toutes les catégories</option>
          {options.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          value={initial.accountId ?? ""}
          onChange={(e) => update({ accountId: e.target.value || undefined })}
          aria-label="Filtrer par compte"
          className={inputClassName}
        >
          <option value="">Tous les comptes</option>
          {options.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <input
          type="date"
          value={initial.from ?? ""}
          onChange={(e) => update({ from: e.target.value || undefined })}
          aria-label="Date de début"
          className={inputClassName}
        />
        <input
          type="date"
          value={initial.to ?? ""}
          onChange={(e) => update({ to: e.target.value || undefined })}
          aria-label="Date de fin"
          className={inputClassName}
        />
        <select
          value={initial.sort}
          onChange={(e) => update({ sort: e.target.value })}
          aria-label="Trier par"
          className={inputClassName}
        >
          {TRANSACTION_SORTS.map((s) => (
            <option key={s} value={s}>
              {SORT_LABELS[s]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          variant="outline"
          onClick={reset}
          disabled={!hasActiveFilters}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Réinitialiser
        </Button>
      </div>
    </div>
  );
}
