"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updateProfileAction } from "@/app/actions/settings";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { getInitials } from "@/components/app/shell-user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  updateProfileSchema,
  type UpdateProfileInput,
} from "@/lib/settings-schemas";
import type { SettingsDTO } from "@/lib/services/settings";

export function ProfileForm({ initial }: { initial: SettingsDTO }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      firstName: initial.firstName,
      lastName: initial.lastName,
      email: initial.email,
      image: initial.image ?? "",
    },
  });

  const imageUrl = (watch("image") ?? "").trim();
  const displayName =
    `${watch("firstName") ?? ""} ${watch("lastName") ?? ""}`.trim();

  const onSubmit = async (values: UpdateProfileInput) => {
    setServerError(null);
    const result = await updateProfileAction({
      ...values,
      image: values.image?.trim() ? values.image.trim() : null,
    });
    if (result.error) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Profil mis à jour avec succès.");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex items-center gap-4">
        <Avatar className="size-16 rounded-xl" size="lg">
          {imageUrl ? (
            <AvatarImage src={imageUrl} alt="Avatar" className="rounded-xl" />
          ) : null}
          <AvatarFallback className="rounded-xl text-lg">
            {getInitials(displayName || null, watch("email") ?? null)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="truncate text-sm font-medium">
            {displayName || "Votre nom"}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            Sans avatar, vos initiales sont affichées.
          </p>
          {imageUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-fit px-0 text-destructive hover:text-destructive"
              onClick={() => setValue("image", "", { shouldDirty: true })}
            >
              Retirer l&apos;avatar
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="settings-firstName" label="Prénom" error={errors.firstName}>
          <input
            id="settings-firstName"
            type="text"
            autoComplete="given-name"
            className={inputClassName}
            aria-invalid={!!errors.firstName}
            {...register("firstName")}
          />
        </Field>
        <Field id="settings-lastName" label="Nom" error={errors.lastName}>
          <input
            id="settings-lastName"
            type="text"
            autoComplete="family-name"
            className={inputClassName}
            aria-invalid={!!errors.lastName}
            {...register("lastName")}
          />
        </Field>
      </div>

      <Field id="settings-email" label="Email" error={errors.email}>
        <input
          id="settings-email"
          type="email"
          autoComplete="email"
          className={inputClassName}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field
        id="settings-image"
        label="Avatar (URL https, optionnel)"
        error={errors.image}
      >
        <input
          id="settings-image"
          type="url"
          inputMode="url"
          placeholder="https://…"
          autoComplete="off"
          className={inputClassName}
          aria-invalid={!!errors.image}
          {...register("image")}
        />
      </Field>

      <FormError message={serverError} />

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Enregistrement…" : "Enregistrer le profil"}
        </Button>
      </div>
    </form>
  );
}
