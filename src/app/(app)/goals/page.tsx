import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { GoalsPageClient } from "@/components/goals/goals-page-client";
import { buttonVariants } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-helpers";
import type { Currency } from "@/lib/account-schemas";
import { prisma } from "@/lib/prisma";
import { listGoals } from "@/lib/services/goals";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Objectifs",
  description: "Suivez vos objectifs d'épargne.",
};

export default async function GoalsPage() {
  const userId = await requireUserId();
  const [result, accounts] = await Promise.all([
    listGoals(userId),
    prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: "asc" },
      select: { currency: true },
    }),
  ]);

  if (result.error || !result.data) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <CircleAlert className="size-7 text-destructive" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Objectifs indisponibles</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {result.error ?? "Impossible de charger vos objectifs."} Veuillez
            réessayer.
          </p>
        </div>
        <Link
          href="/goals"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Réessayer
        </Link>
      </section>
    );
  }

  const currency = (
    accounts.some((a) => a.currency === "MGA") ? "MGA" : (accounts[0]?.currency ?? "MGA")
  ) as Currency;

  return <GoalsPageClient goals={result.data} currency={currency} />;
}
