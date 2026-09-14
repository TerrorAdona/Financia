import { z } from "zod";

export const CURRENCIES = ["MGA", "EUR", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const ACCOUNT_TYPES = [
  "BANK",
  "CASH",
  "MOBILE_MONEY",
  "SAVINGS",
  "CARD",
  "OTHER",
] as const;
export type AccountTypeInput = (typeof ACCOUNT_TYPES)[number];

const nameField = z
  .string({ required_error: "Nom requis." })
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères.")
  .max(50, "Le nom doit contenir au plus 50 caractères.");

const balanceField = z.coerce
  .number({ invalid_type_error: "Solde invalide." })
  .finite("Solde invalide.")
  .min(0, "Le solde ne peut pas être négatif.")
  .max(999_999_999_999.99, "Solde trop élevé.");

const baseAccountSchema = z.object({
  name: nameField,
  type: z.enum(ACCOUNT_TYPES, { required_error: "Type requis." }),
  currency: z.enum(CURRENCIES, { required_error: "Devise requise." }),
  balance: balanceField,
});

export const createAccountSchema = baseAccountSchema;

export const updateAccountSchema = baseAccountSchema.extend({
  id: z.string({ required_error: "Identifiant requis." }).cuid("Compte invalide."),
});

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
