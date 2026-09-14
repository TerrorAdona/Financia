"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { registerAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { registerSchema, type RegisterInput } from "@/lib/auth-schemas";

export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: RegisterInput) => {
    setServerError(null);
    const result = await registerAction(values);
    if (result.error) setServerError(result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="firstName" label="Prénom" error={errors.firstName}>
          <input
            id="firstName"
            type="text"
            autoComplete="given-name"
            placeholder="Aina"
            className={inputClassName}
            aria-invalid={!!errors.firstName}
            {...register("firstName")}
          />
        </Field>

        <Field id="lastName" label="Nom" error={errors.lastName}>
          <input
            id="lastName"
            type="text"
            autoComplete="family-name"
            placeholder="Rakoto"
            className={inputClassName}
            aria-invalid={!!errors.lastName}
            {...register("lastName")}
          />
        </Field>
      </div>

      <Field id="email" label="Email" error={errors.email}>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="aina@exemple.mg"
          className={inputClassName}
          aria-invalid={!!errors.email}
          {...register("email")}
        />
      </Field>

      <Field id="password" label="Mot de passe" error={errors.password}>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          placeholder="8 caractères min., lettres + chiffres"
          className={inputClassName}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      <Field
        id="confirmPassword"
        label="Confirmation du mot de passe"
        error={errors.confirmPassword}
      >
        <input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Répétez le mot de passe"
          className={inputClassName}
          aria-invalid={!!errors.confirmPassword}
          {...register("confirmPassword")}
        />
      </Field>

      <FormError message={serverError} />

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Inscription…" : "Créer mon compte"}
      </Button>
    </form>
  );
}
