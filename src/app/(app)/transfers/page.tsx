import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { TransfersPageClient } from "@/components/transfers/transfers-page-client";
import { buttonVariants } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-helpers";
import {
  listTransferAccounts,
  listTransferRequests,
} from "@/lib/services/transfers";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Transferts",
  description: "Demandes de transfert entre utilisateurs, avec confirmation.",
};

export default async function TransfersPage() {
  const userId = await requireUserId();
  const [result, accounts] = await Promise.all([
    listTransferRequests(userId),
    listTransferAccounts(userId),
  ]);

  if (result.error || !result.data) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <CircleAlert className="size-7 text-destructive" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Transferts indisponibles</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {result.error ?? "Impossible de charger vos transferts."}{" "}
            Veuillez réessayer.
          </p>
        </div>
        <Link
          href="/transfers"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Réessayer
        </Link>
      </section>
    );
  }

  return (
    <TransfersPageClient
      initial={result.data}
      accounts={accounts}
      currentUserId={userId}
    />
  );
}
