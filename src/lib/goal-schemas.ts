import { z } from "zod";

const nameField = z
  .string({ required_error: "Nom requis." })
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères.")
  .max(60, "Le nom doit contenir au plus 60 caractères.");

const descriptionField = z
  .string()
  .trim()
  .max(500, "La description doit contenir au plus 500 caractères.")
  .nullish();

const targetField = z.coerce
  .number({ invalid_type_error: "Montant invalide." })
  .finite("Montant invalide.")
  .gt(0, "L'objectif doit être supérieur à 0.")
  .max(999_999_999_999.99, "Montant trop élevé.");

/** Date cible au format Date (un objectif existant peut être dépassé). */
const deadlineField = z.coerce.date({
  invalid_type_error: "Date invalide.",
});

const baseGoalSchema = z.object({
  name: nameField,
  description: descriptionField,
  targetAmount: targetField,
  deadline: deadlineField,
});

export const createGoalSchema = baseGoalSchema.extend({
  // À la création, la date cible ne doit pas être déjà passée.
  deadline: deadlineField.min(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
    "La date cible ne peut pas être dans le passé.",
  ),
  currentAmount: z.coerce
    .number({ invalid_type_error: "Montant invalide." })
    .finite("Montant invalide.")
    .min(0, "Le montant actuel ne peut pas être négatif.")
    .max(999_999_999_999.99, "Montant trop élevé."),
});

export const updateGoalSchema = baseGoalSchema.extend({
  id: z.string({ required_error: "Identifiant requis." }).cuid("Objectif invalide."),
  currentAmount: z.coerce
    .number({ invalid_type_error: "Montant invalide." })
    .finite("Montant invalide.")
    .min(0, "Le montant actuel ne peut pas être négatif.")
    .max(999_999_999_999.99, "Montant trop élevé."),
});

export const contributeGoalSchema = z.object({
  id: z.string({ required_error: "Identifiant requis." }).cuid("Objectif invalide."),
  amount: z.coerce
    .number({ invalid_type_error: "Montant invalide." })
    .finite("Montant invalide.")
    .gt(0, "La contribution doit être supérieure à 0.")
    .max(999_999_999_999.99, "Montant trop élevé."),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;
export type ContributeGoalInput = z.infer<typeof contributeGoalSchema>;
