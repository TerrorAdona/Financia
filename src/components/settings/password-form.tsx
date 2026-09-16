"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { changePasswordAction } from "@/app/actions/settings";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { Button } from "@/components/ui/button";
import {
  changePasswordSchema,
  type ChangePasswordInput,
} from "@/lib/settings-schemas";

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  if (!hasPassword) {
    return (
      <p className="text-sm text-muted-foreground">
        Aucun mot de passe défini sur ce compte : le changement de mot de
        passe est indisponible.
      </p>
    );
  }

  const onSubmit = async (values: ChangePasswordInput) => {
    setServerError(null);
    const result = await changePasswordAction(values);
    if (result.error) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Mot de passe modifié avec succès.");
    reset();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <Field
        id="settings-currentPassword"
        label="Mot de passe actuel"
        error={errors.currentPassword}
      >
        <input
          id="settings-currentPassword"
          type="password"
          autoComplete="current-password"
          className={inputClassName}
          aria-invalid={!!errors.currentPassword}
          {...register("currentPassword")}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field
          id="settings-newPassword"
          label="Nouveau mot de passe"
          error={errors.newPassword}
        >
          <input
            id="settings-newPassword"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            aria-invalid={!!errors.newPassword}
            {...register("newPassword")}
          />
        </Field>
        <Field
          id="settings-confirmPassword"
          label="Confirmer le nouveau mot de passe"
          error={errors.confirmPassword}
        >
          <input
            id="settings-confirmPassword"
            type="password"
            autoComplete="new-password"
            className={inputClassName}
            aria-invalid={!!errors.confirmPassword}
            {...register("confirmPassword")}
          />
        </Field>
      </div>

      <p className="text-xs text-muted-foreground">
        8 caractères minimum, avec au moins une lettre et un chiffre.
      </p>

      <FormError message={serverError} />

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Modification…" : "Changer le mot de passe"}
        </Button>
      </div>
    </form>
  );
}
