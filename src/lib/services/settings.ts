import { prisma } from "@/lib/prisma";
import { firstIssue } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";
import type {
  ChangePasswordInput,
  DeleteAccountInput,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from "@/lib/settings-schemas";
import {
  changePasswordSchema,
  deleteAccountSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from "@/lib/settings-schemas";

export type SettingsDTO = {
  firstName: string;
  lastName: string;
  email: string;
  image: string | null;
  preferredCurrency: string;
  locale: string;
  dateFormat: string;
  /** Faux pour les comptes sans mot de passe (changement impossible). */
  hasPassword: boolean;
};

export type SettingsResult<T = undefined> = {
  data?: T;
  error?: string;
};

/**
 * Toutes les fonctions prennent le userId de la SESSION (requireUserId)
 * et n'acceptent aucun identifiant cible : un utilisateur ne peut
 * lire/modifier que ses propres données (`where: { id: userId }`).
 */
export async function getSettings(
  userId: string,
): Promise<SettingsResult<SettingsDTO>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      image: true,
      preferredCurrency: true,
      locale: true,
      dateFormat: true,
      passwordHash: true,
    },
  });
  if (!user) return { error: "Utilisateur introuvable." };
  const { passwordHash: _ignored, ...rest } = user;
  return {
    data: {
      ...rest,
      firstName: rest.firstName ?? "",
      lastName: rest.lastName ?? "",
      hasPassword: _ignored !== null,
    },
  };
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<SettingsResult<SettingsDTO>> {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const v = parsed.data;

  // Email déjà pris PAR UN AUTRE utilisateur ?
  const taken = await prisma.user.findUnique({
    where: { email: v.email },
    select: { id: true },
  });
  if (taken && taken.id !== userId) {
    return { error: "Un compte existe déjà avec cet email." };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      firstName: v.firstName,
      lastName: v.lastName,
      name: `${v.firstName} ${v.lastName}`,
      email: v.email,
      image: v.image?.trim() ? v.image.trim() : null,
    },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      image: true,
      preferredCurrency: true,
      locale: true,
      dateFormat: true,
      passwordHash: true,
    },
  });
  const { passwordHash: _ignored, ...rest } = updated;
  return {
    data: {
      ...rest,
      firstName: rest.firstName ?? "",
      lastName: rest.lastName ?? "",
      hasPassword: _ignored !== null,
    },
  };
}

export async function updatePreferences(
  userId: string,
  input: UpdatePreferencesInput,
): Promise<SettingsResult<Pick<SettingsDTO, "preferredCurrency" | "locale" | "dateFormat">>> {
  const parsed = updatePreferencesSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      preferredCurrency: parsed.data.preferredCurrency,
      locale: parsed.data.locale,
      dateFormat: parsed.data.dateFormat,
    },
    select: { preferredCurrency: true, locale: true, dateFormat: true },
  });
  return { data: updated };
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<SettingsResult> {
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  });
  if (!user) return { error: "Utilisateur introuvable." };
  if (!user.passwordHash) {
    return { error: "Aucun mot de passe défini sur ce compte." };
  }
  const valid = await verifyPassword(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!valid) return { error: "Mot de passe actuel incorrect." };

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });
  return { data: undefined };
}

/**
 * Suppression définitive du compte après confirmation forte
 * (email exact + mot de passe actuel vérifiés).
 * Les données associées sont supprimées en cascade selon le schéma
 * Prisma : comptes, transactions, catégories, budgets, objectifs,
 * notifications, demandes de transfert (onDelete: Cascade).
 */
export async function deleteAccount(
  userId: string,
  input: DeleteAccountInput,
): Promise<SettingsResult> {
  const parsed = deleteAccountSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });
  if (!user) return { error: "Utilisateur introuvable." };
  if (parsed.data.email !== user.email) {
    return { error: "L'email saisi ne correspond pas à votre compte." };
  }
  if (!user.passwordHash) {
    return { error: "Suppression impossible : aucun mot de passe défini." };
  }
  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return { error: "Mot de passe incorrect." };

  await prisma.user.delete({ where: { id: userId } });
  return { data: undefined };
}
