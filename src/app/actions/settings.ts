"use server";

import { revalidatePath } from "next/cache";

import { signOut } from "@/auth";
import { requireUserId } from "@/lib/auth-helpers";
import type {
  ChangePasswordInput,
  DeleteAccountInput,
  UpdatePreferencesInput,
  UpdateProfileInput,
} from "@/lib/settings-schemas";
import type { SettingsDTO, SettingsResult } from "@/lib/services/settings";
import {
  changePassword as changePasswordService,
  deleteAccount as deleteAccountService,
  getSettings as getSettingsService,
  updatePreferences as updatePreferencesService,
  updateProfile as updateProfileService,
} from "@/lib/services/settings";

function revalidateSettings(): void {
  // Le layout (app) affiche nom/email/avatar : router.refresh() côté
  // client recharge aussi ces segments après chaque succès.
  revalidatePath("/settings");
}

export async function getSettingsAction(): Promise<
  SettingsResult<SettingsDTO>
> {
  const userId = await requireUserId();
  return getSettingsService(userId);
}

export async function updateProfileAction(
  input: UpdateProfileInput,
): Promise<SettingsResult<SettingsDTO>> {
  const userId = await requireUserId();
  const result = await updateProfileService(userId, input);
  if (!result.error) revalidateSettings();
  return result;
}

export async function updatePreferencesAction(
  input: UpdatePreferencesInput,
): Promise<SettingsResult<Pick<SettingsDTO, "locale" | "dateFormat">>> {
  const userId = await requireUserId();
  const result = await updatePreferencesService(userId, input);
  if (!result.error) revalidateSettings();
  return result;
}

export async function changePasswordAction(
  input: ChangePasswordInput,
): Promise<SettingsResult> {
  const userId = await requireUserId();
  return changePasswordService(userId, input);
}

export async function deleteAccountAction(
  input: DeleteAccountInput,
): Promise<SettingsResult> {
  const userId = await requireUserId();
  const result = await deleteAccountService(userId, input);
  if (result.error) return result;
  // Compte supprimé : déconnexion immédiate (throw NEXT_REDIRECT).
  await signOut({ redirectTo: "/login?deleted=1" });
  return { data: undefined };
}
