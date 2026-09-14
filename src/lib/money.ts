import type { AccountType } from "@prisma/client";

import type { Currency } from "@/lib/account-schemas";

export const CURRENCY_LABELS: Record<Currency, string> = {
  MGA: "Ariary (Ar)",
  EUR: "Euro (€)",
  USD: "Dollar ($)",
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

const eurFormat = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

const usdFormat = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "USD",
});

/**
 * Formate un montant selon la devise.
 * MGA : "1 500 000 Ar" (Ariary indivisible, sans décimales).
 * EUR/USD : format monétaire fr-FR ("1 234,50 €").
 */
export function formatMoney(
  amount: number | string,
  currency: Currency,
): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  if (currency === "MGA") return `${mgaGrouping.format(n)} Ar`;
  if (currency === "EUR") return eurFormat.format(n);
  return usdFormat.format(n);
}
