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

/**
 * Demande de transfert vers le compte d'un AUTRE utilisateur.
 * Mêmes contraintes que le transfert instantané, sans date (l'écriture
 * est datée à l'acceptation) ; aucun mouvement de fonds à la demande.
 */
export const requestTransferSchema = z
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

export type RequestTransferInput = z.infer<typeof requestTransferSchema>;

/** Acceptation / refus / annulation d'une demande (identifiant uniquement). */
export const transferDecisionSchema = z.object({
  id: z
    .string({ required_error: "Identifiant requis." })
    .cuid("Demande invalide."),
});

export type TransferDecisionInput = z.infer<typeof transferDecisionSchema>;

/** Recherche d'un destinataire par nom ou email (saisie libre). */
export const recipientSearchSchema = z.object({
  q: z
    .string()
    .trim()
    .min(2, "Tapez au moins 2 caractères pour rechercher.")
    .max(100, "Recherche trop longue."),
});

export type RecipientSearchInput = z.infer<typeof recipientSearchSchema>;
