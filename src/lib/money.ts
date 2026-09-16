import type { AccountType } from "@prisma/client";

import type { Currency } from "@/lib/account-schemas";

export const CURRENCY_LABELS: Record<Currency, string> = {
  MGA: "Ariary (Ar)",
};

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  BANK: "Banque",
  CASH: "Espèces",
  MOBILE_MONEY: "Mobile Money",
  SAVINGS: "Épargne",
  CARD: "Carte bancaire",
  OTHER: "Autre",
};

const mgaGrouping = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0,
});

/**
 * Formate un montant en Ariary : "1 500 000 Ar"
 * (Ariary indivisible, sans décimales). Le paramètre `currency` est
 * conservé pour compatibilité (vaut toujours "MGA").
 */
export function formatMoney(
  amount: number | string,
  currency: Currency,
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  void currency;
  return `${mgaGrouping.format(n)} Ar`;
}
