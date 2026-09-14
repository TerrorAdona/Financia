import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { APP_TAGLINE } from "@/constants/app";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-8 py-12 text-center">
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm text-muted-foreground">
        <CheckCircle2 className="size-4 text-green-600" aria-hidden="true" />
        Projet initialisé avec succès
      </span>

      <div className="flex max-w-2xl flex-col gap-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Bienvenue sur Financia
        </h1>
        <p className="text-lg text-muted-foreground">{APP_TAGLINE}</p>
        <p className="text-sm text-muted-foreground">
          Page d&apos;accueil temporaire — le tableau de bord, les
          transactions, les budgets et les graphiques seront construits dans
          les prochaines étapes.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Link href="/register" className={cn(buttonVariants({ size: "lg" }))}>
          Créer un compte
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link
          href="/login"
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Se connecter
        </Link>
      </div>

      <dl className="grid w-full max-w-2xl grid-cols-1 gap-4 pt-4 text-left sm:grid-cols-3">
        {[
          {
            title: "Next.js + TypeScript",
            description: "App Router, ESLint et alias @/* configurés.",
          },
          {
            title: "Tailwind + shadcn/ui",
            description: "Thème CSS variables, Button et utilitaire cn.",
          },
          {
            title: "Structure évolutive",
            description: "Dossiers components, lib, hooks, types.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-xl border bg-card p-4">
            <dt className="font-medium">{item.title}</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              {item.description}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
