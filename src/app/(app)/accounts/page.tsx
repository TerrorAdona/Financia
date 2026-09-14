import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { AccountsPageClient } from "@/components/accounts/accounts-page-client";
import { buttonVariants } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-helpers";
import { listAccounts } from "@/lib/services/accounts";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Comptes",
  description: "Gérez vos comptes bancaires, espèces et mobile money.",
};

export default async function AccountsPage() {
  const userId = await requireUserId();
  const result = await listAccounts(userId);

  if (result.error || !result.data) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <CircleAlert className="size-7 text-destructive" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Comptes indisponibles</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {result.error ?? "Impossible de charger vos comptes."} Veuillez
            réessayer.
          </p>
        </div>
        <Link
          href="/accounts"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Réessayer
        </Link>
      </section>
    );
  }

  return <AccountsPageClient accounts={result.data} />;
}
