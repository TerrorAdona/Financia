import { z } from "zod";

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE", "TRANSFER"] as const;
export type TransactionTypeInput = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_TYPE_LABELS: Record<TransactionTypeInput, string> = {
  INCOME: "Revenu",
  EXPENSE: "Dépense",
  TRANSFER: "Transfert",
};

export const TRANSACTION_SORTS = [
  "date_desc",
  "date_asc",
  "amount_desc",
  "amount_asc",
] as const;
export type TransactionSort = (typeof TRANSACTION_SORTS)[number];

export const PAGE_SIZES = [10, 20, 50] as const;

const baseTransactionSchema = z.object({
  description: z
    .string({ required_error: "Description requise." })
    .trim()
    .min(2, "La description doit contenir au moins 2 caractères.")
    .max(100, "La description doit contenir au plus 100 caractères."),
  amount: z.coerce
    .number({ invalid_type_error: "Montant invalide." })
    .finite("Montant invalide.")
    .gt(0, "Le montant doit être supérieur à 0.")
    .max(999_999_999_999.99, "Montant trop élevé."),
  type: z.enum(TRANSACTION_TYPES, { required_error: "Type requis." }),
  accountId: z
    .string({ required_error: "Compte requis." })
    .cuid("Compte invalide."),
  // Les selects non affichés valent "" (chaîne vide) côté formulaire :
  // on la normalise en undefined avant validation.
  categoryId: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().cuid("Catégorie invalide.").nullish(),
  ),
  toAccountId: z.preprocess(
    (v) => (v === "" ? undefined : v),
    z.string().cuid("Compte destinataire invalide.").nullish(),
  ),
  date: z.coerce
    .date({ invalid_type_error: "Date invalide." })
    .max(new Date(Date.now() + 24 * 60 * 60 * 1000), "La date ne peut pas être dans le futur."),
  note: z
    .string()
    .trim()
    .max(500, "La note doit contenir au plus 500 caractères.")
    .nullish(),
});

const transferRules = <T extends z.ZodTypeAny>(schema: T) =>
  schema.superRefine((val, ctx) => {
    const v = val as {
      type: TransactionTypeInput;
      categoryId?: string | null;
      toAccountId?: string | null;
      accountId: string;
    };
    if (v.type === "TRANSFER") {
      if (!v.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le compte destinataire est requis pour un transfert.",
          path: ["toAccountId"],
        });
      } else if (v.toAccountId === v.accountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le compte destinataire doit être différent du compte source.",
          path: ["toAccountId"],
        });
      }
    } else {
      if (!v.categoryId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "La catégorie est requise.",
          path: ["categoryId"],
        });
      }
      if (v.toAccountId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Le compte destinataire est réservé aux transferts.",
          path: ["toAccountId"],
        });
      }
    }
  });

export const createTransactionSchema = transferRules(baseTransactionSchema);

export const updateTransactionSchema = transferRules(
  baseTransactionSchema.extend({
    id: z.string({ required_error: "Identifiant requis." }).cuid("Transaction invalide."),
  }),
);

/**
 * Validation côté formulaire en édition : `updateTransactionSchema` étant
 * enveloppé par `transferRules` (ZodEffects, sans `.omit()`), on réutilise
 * `createTransactionSchema`, strictement équivalent une fois l'`id` retiré
 * (le refine de transfert n'inspecte pas l'`id`).
 * L'`id` est ajouté seulement à l'appel de l'action, depuis les props :
 * valider avec `updateTransactionSchema` bloquerait silencieusement la
 * soumission (champ `id` requis mais jamais affiché).
 */
export const editTransactionSchema = createTransactionSchema;

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

/** Filtres lus depuis les paramètres d'URL (tout est optionnel). */
export const transactionFiltersSchema = z.object({
  q: z.string().trim().max(100).optional().default(""),
  type: z.enum(TRANSACTION_TYPES).optional(),
  categoryId: z.string().cuid().optional(),
  accountId: z.string().cuid().optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(TRANSACTION_SORTS).optional().default("date_desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(5)
    .max(50)
    .optional()
    .default(10),
});

export type TransactionFilters = z.infer<typeof transactionFiltersSchema>;
