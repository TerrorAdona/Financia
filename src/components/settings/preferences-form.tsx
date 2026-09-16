"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { updatePreferencesAction } from "@/app/actions/settings";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import { Button } from "@/components/ui/button";
import {
  DATE_FORMAT_LABELS,
  DATE_FORMATS,
  LOCALE_LABELS,
  LOCALES,
  updatePreferencesSchema,
  type UpdatePreferencesInput,
} from "@/lib/settings-schemas";
import type { SettingsDTO } from "@/lib/services/settings";

const LOCALE_TAGS: Record<string, string> = { fr: "fr-FR", en: "en-US" };

/** Aperçu localisé : 1 500 000 Ar + 16/09/2026 au format choisi. */
export function formatSettingsPreview(
  locale: string,
  dateFormat: string,
): { amount: string; date: string } {
  const tag = LOCALE_TAGS[locale] ?? "fr-FR";
  const amount = new Intl.NumberFormat(tag, {
    style: "currency",
    currency: "MGA",
    maximumFractionDigits: 0,
  }).format(1_500_000);
  const d = new Date(Date.UTC(2026, 8, 16));
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const date =
    dateFormat === "yyyy-MM-dd"
      ? `${yyyy}-${mm}-${dd}`
      : dateFormat === "MM/dd/yyyy"
        ? `${mm}/${dd}/${yyyy}`
        : `${dd}/${mm}/${yyyy}`;
  return { amount, date };
}

export function PreferencesForm({ initial }: { initial: SettingsDTO }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<UpdatePreferencesInput>({
    resolver: zodResolver(updatePreferencesSchema),
    defaultValues: {
      locale: (initial.locale === "en" ? "en" : "fr") as "fr" | "en",
      dateFormat: (DATE_FORMATS as readonly string[]).includes(initial.dateFormat)
        ? (initial.dateFormat as UpdatePreferencesInput["dateFormat"])
        : "dd/MM/yyyy",
    },
  });

  const preview = formatSettingsPreview(watch("locale"), watch("dateFormat"));

  const onSubmit = async (values: UpdatePreferencesInput) => {
    setServerError(null);
    const result = await updatePreferencesAction(values);
    if (result.error) {
      setServerError(result.error);
      toast.error(result.error);
      return;
    }
    toast.success("Préférences enregistrées avec succès.");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field id="settings-locale" label="Langue" error={errors.locale}>
          <select
            id="settings-locale"
            className={inputClassName}
            aria-invalid={!!errors.locale}
            {...register("locale")}
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>
                {LOCALE_LABELS[l]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="settings-dateFormat" label="Format de date" error={errors.dateFormat}>
          <select
            id="settings-dateFormat"
            className={inputClassName}
            aria-invalid={!!errors.dateFormat}
            {...register("dateFormat")}
          >
            {DATE_FORMATS.map((f) => (
              <option key={f} value={f}>
                {DATE_FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <p role="status" className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
        Devise unique : <span className="font-medium text-foreground">Ariary (Ar)</span>
        {" · "}
        Aperçu : <span className="font-medium text-foreground">{preview.amount}</span>
        {" · "}
        <span className="font-medium text-foreground">{preview.date}</span>
      </p>

      <FormError message={serverError} />

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
          {isSubmitting ? "Enregistrement…" : "Enregistrer les préférences"}
        </Button>
      </div>
    </form>
  );
}
