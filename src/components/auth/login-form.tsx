"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { loginSchema, type LoginInput } from "@/lib/auth-schemas";

export function LoginForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: LoginInput) => {
    setServerError(null);
    const result = await loginAction(values);
    if (result.error) setServerError(result.error);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
          autoComplete="current-password"
          placeholder="••••••••"
          className={inputClassName}
          aria-invalid={!!errors.password}
          {...register("password")}
        />
      </Field>

      <FormError message={serverError} />

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Connexion…" : "Se connecter"}
      </Button>
    </form>
  );
}
