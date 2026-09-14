import { z } from "zod";

const nameField = (label: string) =>
  z
    .string({ required_error: `${label} requis.` })
    .trim()
    .min(2, `${label} doit contenir au moins 2 caractères.`)
    .max(50, `${label} doit contenir au plus 50 caractères.`)
    .regex(
      /^[A-Za-zÀ-ÖØ-öø-ÿ' -]+$/,
      `${label} contient des caractères invalides.`,
    );

export const registerSchema = z
  .object({
    firstName: nameField("Le prénom"),
    lastName: nameField("Le nom"),
    email: z
      .string({ required_error: "Email requis." })
      .trim()
      .toLowerCase()
      .email("Adresse email invalide.")
      .max(255, "Adresse email trop longue."),
    password: z
      .string({ required_error: "Mot de passe requis." })
      .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
      .max(100, "Le mot de passe doit contenir au plus 100 caractères.")
      .regex(/[a-zA-Z]/, "Le mot de passe doit contenir au moins une lettre.")
      .regex(/[0-9]/, "Le mot de passe doit contenir au moins un chiffre."),
    confirmPassword: z.string({ required_error: "Confirmation requise." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Les mots de passe ne correspondent pas.",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email requis." })
    .trim()
    .toLowerCase()
    .email("Adresse email invalide."),
  password: z.string({ required_error: "Mot de passe requis." }).min(1, "Mot de passe requis."),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
