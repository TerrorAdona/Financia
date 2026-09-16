import { z } from "zod";

const personNameField = (label: string) =>
  z
    .string({ required_error: `${label} requis.` })
    .trim()
    .min(2, `${label} doit contenir au moins 2 caractères.`)
    .max(50, `${label} doit contenir au plus 50 caractères.`)
    .regex(
      /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/,
      `${label} contient des caractères invalides.`,
    );

const emailField = z
  .string({ required_error: "Email requis." })
  .trim()
  .toLowerCase()
  .email("Adresse email invalide.")
  .max(255, "Adresse email trop longue.");

const newPasswordField = z
  .string({ required_error: "Mot de passe requis." })
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
  .max(100, "Le mot de passe doit contenir au plus 100 caractères.")
  .regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre.");

/** Section Profil : prénom, nom, email, avatar (URL). */
export const updateProfileSchema = z.object({
  firstName: personNameField("Le prénom"),
  lastName: personNameField("Le nom"),
  email: emailField,
  // Champ libre : "" / null / absent = aucun avatar (initiales affichées).
  // La normalisation "" -> null est faite à la soumission (formulaire).
  image: z
    .string()
    .trim()
    .max(2048, "URL trop longue.")
    .nullish()
    .refine(
      (v) => v === null || v === undefined || v === "" || /^https?:\/\/\S+$/.test(v),
      "URL d'avatar invalide (https://…).",
    ),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const LOCALES = ["fr", "en"] as const;
export type LocaleInput = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<LocaleInput, string> = {
  fr: "Français",
  en: "English",
};

export const DATE_FORMATS = ["dd/MM/yyyy", "yyyy-MM-dd", "MM/dd/yyyy"] as const;
export type DateFormatInput = (typeof DATE_FORMATS)[number];

export const DATE_FORMAT_LABELS: Record<DateFormatInput, string> = {
  "dd/MM/yyyy": "JJ/MM/AAAA — 16/09/2026",
  "yyyy-MM-dd": "AAAA-MM-JJ — 2026-09-16",
  "MM/dd/yyyy": "MM/JJ/AAAA — 09/16/2026",
};

/** Section Préférences : langue, format de date (devise unique : MGA). */
export const updatePreferencesSchema = z.object({
  locale: z.enum(LOCALES, { required_error: "Langue requise." }),
  dateFormat: z.enum(DATE_FORMATS, { required_error: "Format requis." }),
});

export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;

/** Section Sécurité : changement de mot de passe. */
export const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: "Mot de passe actuel requis." })
      .min(1, "Mot de passe actuel requis."),
    newPassword: newPasswordField,
    confirmPassword: z.string({ required_error: "Confirmation requise." }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.newPassword !== data.currentPassword, {
    message: "Le nouveau mot de passe doit être différent de l'actuel.",
    path: ["newPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

/**
 * Section Compte : confirmation forte de suppression.
 * L'email doit correspondre exactement au compte + mot de passe actuel.
 */
export const deleteAccountSchema = z.object({
  email: emailField,
  password: z
    .string({ required_error: "Mot de passe requis." })
    .min(1, "Mot de passe requis."),
});

export type DeleteAccountInput = z.infer<typeof deleteAccountSchema>;
