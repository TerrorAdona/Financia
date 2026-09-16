import { z } from "zod";

/** Un message d'historique transmis au modèle (rôles stricts). */
export const chatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .trim()
    .min(1, "Message vide.")
    .max(2000, "Message trop long."),
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/** Question + historique récent (plafonné pour maîtriser le contexte). */
export const chatInputSchema = z.object({
  message: z
    .string({ required_error: "Écrivez votre question." })
    .trim()
    .min(1, "Écrivez votre question.")
    .max(500, "Question trop longue (500 caractères maximum)."),
  history: z.array(chatMessageSchema).max(10).default([]),
});

export type ChatInput = z.infer<typeof chatInputSchema>;
