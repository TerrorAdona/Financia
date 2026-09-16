import { z } from "zod";

/**
 * Schéma du transfert dédié : Depuis (compte source) / Vers (compte
 * destination) / Montant. La description est optionnelle (générée
 * automatiquement « Transfert A → B » si absente) et la date vaut
 * aujourd'hui par défaut.
 */
export const createTransferSchema = z
  .object({
    fromAccountId: z
      .string({ required_error: "Compte source requis." })
      .cuid("Compte source invalide."),
    toAccountId: z
      .string({ required_error: "Compte destinataire requis." })
      .cuid("Compte destinataire invalide."),
    amount: z.coerce
      .number({ invalid_type_error: "Montant invalide." })
      .finite("Montant invalide.")
      .gt(0, "Le montant doit être supérieur à 0.")
      .max(999_999_999_999.99, "Montant trop élevé."),
    description: z
      .string()
      .trim()
      .max(100, "La description doit contenir au plus 100 caractères.")
      .nullish(),
    date: z.coerce
      .date({ invalid_type_error: "Date invalide." })
      .max(
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        "La date ne peut pas être dans le futur.",
      )
      .nullish(),
  })
  .superRefine((v, ctx) => {
    if (v.toAccountId && v.fromAccountId && v.toAccountId === v.fromAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le compte destinataire doit être différent du compte source.",
        path: ["toAccountId"],
      });
    }
  });

export type CreateTransferInput = z.infer<typeof createTransferSchema>;
