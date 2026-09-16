import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { SettingsPageClient } from "@/components/settings/settings-page-client";
import { buttonVariants } from "@/components/ui/button";
import { getSettingsAction } from "@/app/actions/settings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Paramètres",
  description: "Profil, préférences, apparence, sécurité et compte.",
};

export default async function SettingsPage() {
  // requireUserId() interne : redirige vers /login si non connecté.
  const result = await getSettingsAction();

  if (result.error || !result.data) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <CircleAlert className="size-7 text-destructive" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Paramètres indisponibles</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {result.error ?? "Impossible de charger vos paramètres."}{" "}
            Veuillez réessayer.
          </p>
        </div>
        <Link
          href="/settings"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Réessayer
        </Link>
      </section>
    );
  }

  return <SettingsPageClient initial={result.data} />;
}
