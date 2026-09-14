import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Placeholder propre pour les pages non encore développées.
 * Affiche l'icône, le titre et un message d'attente — sans logique métier.
 */
export function PagePlaceholder({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <Icon className="size-7 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="flex flex-col items-center gap-2">
        <Badge variant="secondary">Bientôt disponible</Badge>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        <p className="max-w-md text-muted-foreground">{description}</p>
      </div>
      <Link
        href="/dashboard"
        className={cn(buttonVariants({ variant: "outline" }))}
      >
        Retour au tableau de bord
      </Link>
    </section>
  );
}
