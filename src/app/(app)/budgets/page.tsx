import type { Metadata } from "next";
import Link from "next/link";
import { CircleAlert } from "lucide-react";

import { BudgetsPageClient } from "@/components/budgets/budgets-page-client";
import { buttonVariants } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-helpers";
import { currentMonth } from "@/lib/budget-schemas";
import { listBudgets } from "@/lib/services/budgets";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Budgets",
  description: "Définissez des plafonds par catégorie.",
};

export default async function BudgetsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month)
      ? params.month
      : currentMonth();

  const [result, categories] = await Promise.all([
    listBudgets(userId, month),
    prisma.category.findMany({
      where: { userId, type: "EXPENSE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, color: true, icon: true },
    }),
  ]);

  if (result.error || !result.data) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
          <CircleAlert className="size-7 text-destructive" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-bold">Budgets indisponibles</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            {result.error ?? "Impossible de charger vos budgets."} Veuillez
            réessayer.
          </p>
        </div>
        <Link
          href="/budgets"
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          Réessayer
        </Link>
      </section>
    );
  }

  return (
    <BudgetsPageClient
      budgets={result.data.budgets}
      month={result.data.month}
      monthLabel={result.data.monthLabel}
      currency={result.data.currency}
      categories={categories.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color ?? "#64748b",
        icon: c.icon ?? "Tag",
      }))}
    />
  );
}
