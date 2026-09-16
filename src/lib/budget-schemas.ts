import { z } from "zod";

export const BUDGET_THRESHOLDS = [50, 75, 90, 100] as const;
export type BudgetThreshold = (typeof BUDGET_THRESHOLDS)[number];

/** "2026-09" */
export const monthString = z
  .string({ required_error: "Mois requis." })
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mois invalide (AAAA-MM).");

const baseBudgetSchema = z.object({
  name: z
    .string({ required_error: "Nom requis." })
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(60, "Le nom doit contenir au plus 60 caractères."),
  categoryId: z
    .string({ required_error: "Catégorie requise." })
    .cuid("Catégorie invalide."),
  month: monthString,
  amountLimit: z.coerce
    .number({ invalid_type_error: "Montant invalide." })
    .finite("Montant invalide.")
    .gt(0, "Le budget doit être supérieur à 0.")
    .max(999_999_999_999.99, "Montant trop élevé."),
});

export const createBudgetSchema = baseBudgetSchema;

export const updateBudgetSchema = baseBudgetSchema.extend({
  id: z.string({ required_error: "Identifiant requis." }).cuid("Budget invalide."),
});

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;

/** "2026-09" -> [1er du mois 00:00, 1er du mois suivant 00:00] (fuseau applicatif). */
export function monthToRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split("-").map(Number);
  const TZ = 3 * 60 * 60 * 1000;
  return {
    start: new Date(Date.UTC(y, m - 1, 1) - TZ),
    end: new Date(Date.UTC(y, m, 1) - TZ),
  };
}

/** Mois courant "AAAA-MM" dans le fuseau applicatif. */
export function currentMonth(now: Date = new Date()): string {
  const shifted = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** Libellé "septembre 2026" pour "2026-09". */
const monthFmt = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "Indian/Antananarivo",
});

export function monthLabel(month: string): string {
  const { start } = monthToRange(month);
  return monthFmt.format(start);
}
