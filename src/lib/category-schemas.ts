import { z } from "zod";

export const CATEGORY_TYPES = ["INCOME", "EXPENSE"] as const;
export type CategoryTypeInput = (typeof CATEGORY_TYPES)[number];

export const CATEGORY_TYPE_LABELS: Record<CategoryTypeInput, string> = {
  INCOME: "Revenu",
  EXPENSE: "Dépense",
};

export const CATEGORY_ICONS = [
  "Briefcase",
  "Laptop",
  "Store",
  "TrendingUp",
  "Gift",
  "CirclePlus",
  "ShoppingCart",
  "Home",
  "Car",
  "HeartPulse",
  "GraduationCap",
  "Clapperboard",
  "ShoppingBag",
  "Repeat",
  "Receipt",
  "Phone",
  "Tag",
] as const;
export type CategoryIconName = (typeof CATEGORY_ICONS)[number];

export const CATEGORY_COLORS = [
  "#22c55e",
  "#10b981",
  "#14b8a6",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#64748b",
] as const;

export type DefaultCategoryDef = {
  name: string;
  type: CategoryTypeInput;
  icon: CategoryIconName;
  color: string;
};

/** Jeu de catégories créé automatiquement pour chaque nouvel utilisateur. */
export const DEFAULT_CATEGORIES: DefaultCategoryDef[] = [
  // Revenus
  { name: "Salaire", type: "INCOME", icon: "Briefcase", color: "#10b981" },
  { name: "Freelance", type: "INCOME", icon: "Laptop", color: "#0ea5e9" },
  { name: "Business", type: "INCOME", icon: "Store", color: "#6366f1" },
  { name: "Investissement", type: "INCOME", icon: "TrendingUp", color: "#22c55e" },
  { name: "Cadeau", type: "INCOME", icon: "Gift", color: "#ec4899" },
  { name: "Autres revenus", type: "INCOME", icon: "CirclePlus", color: "#64748b" },
  // Dépenses
  { name: "Alimentation", type: "EXPENSE", icon: "ShoppingCart", color: "#22c55e" },
  { name: "Logement", type: "EXPENSE", icon: "Home", color: "#a855f7" },
  { name: "Transport", type: "EXPENSE", icon: "Car", color: "#3b82f6" },
  { name: "Santé", type: "EXPENSE", icon: "HeartPulse", color: "#ef4444" },
  { name: "Éducation", type: "EXPENSE", icon: "GraduationCap", color: "#6366f1" },
  { name: "Loisirs", type: "EXPENSE", icon: "Clapperboard", color: "#ec4899" },
  { name: "Shopping", type: "EXPENSE", icon: "ShoppingBag", color: "#f97316" },
  { name: "Abonnements", type: "EXPENSE", icon: "Repeat", color: "#14b8a6" },
  { name: "Factures", type: "EXPENSE", icon: "Receipt", color: "#f59e0b" },
  { name: "Communication", type: "EXPENSE", icon: "Phone", color: "#0ea5e9" },
  { name: "Autres", type: "EXPENSE", icon: "Tag", color: "#64748b" },
];

const baseCategorySchema = z.object({
  name: z
    .string({ required_error: "Nom requis." })
    .trim()
    .min(2, "Le nom doit contenir au moins 2 caractères.")
    .max(40, "Le nom doit contenir au plus 40 caractères."),
  type: z.enum(CATEGORY_TYPES, { required_error: "Type requis." }),
  icon: z.enum(CATEGORY_ICONS, { required_error: "Icône requise." }),
  color: z
    .string({ required_error: "Couleur requise." })
    .regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide."),
});

export const createCategorySchema = baseCategorySchema;

export const updateCategorySchema = baseCategorySchema.extend({
  id: z.string({ required_error: "Identifiant requis." }).cuid("Catégorie invalide."),
});

/**
 * Validation côté formulaire en édition : règles `update` sans le `id`
 * (ajouté seulement à l'appel de l'action, depuis les props).
 * Valider avec `updateCategorySchema` bloquerait silencieusement la
 * soumission (champ `id` requis mais jamais affiché).
 */
export const editCategorySchema = updateCategorySchema.omit({ id: true });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
