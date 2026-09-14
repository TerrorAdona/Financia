import type { Metadata } from "next";
import Link from "next/link";
import { LayoutDashboard, Plus, Wallet } from "lucide-react";

import { DashboardCards } from "@/components/dashboard/dashboard-cards";
import {
  Highlights,
  LatestTransactions,
  TopAccounts,
} from "@/components/dashboard/dashboard-lists";
import { EvolutionChart } from "@/components/dashboard/evolution-chart";
import { ExpensesPie } from "@/components/dashboard/expenses-pie";
import { buttonVariants } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-helpers";
import {
  getDashboardData,
  parseDashboardRange,
} from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Vue d'ensemble de vos finances.",
};

function DashboardEmpty() {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
        <LayoutDashboard className="size-7 text-muted-foreground" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Bienvenue sur votre dashboard
        </h1>
        <p className="max-w-md text-muted-foreground">
          Créez votre premier compte pour voir ici votre solde, vos revenus,
          vos dépenses et vos graphiques.
        </p>
      </div>
      <Link href="/accounts" className={cn(buttonVariants({ size: "lg" }))}>
        <Wallet className="size-4" aria-hidden="true" />
        Créer un compte
      </Link>
    </section>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const data = await getDashboardData(userId, parseDashboardRange(params.range));

  if (!data) return <DashboardEmpty />;

  return (
    <section className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Vue d&apos;ensemble de vos finances en {data.currency === "MGA" ? "Ariary" : data.currency}.
          </p>
        </div>
        <Link href="/transactions" className={cn(buttonVariants())}>
          <Plus className="size-4" aria-hidden="true" />
          Nouvelle transaction
        </Link>
      </div>

      {data.excludedAccounts > 0 ? (
        <p className="rounded-lg border px-3 py-2 text-sm text-muted-foreground" role="note">
          {data.excludedAccounts} compte(s) dans une autre devise exclus des
          totaux et graphiques.
        </p>
      ) : null}

      <DashboardCards data={data} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <EvolutionChart data={data} />
        </div>
        <ExpensesPie slices={data.expensesByCategory} currency={data.currency} />
      </div>

      <Highlights data={data} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <LatestTransactions data={data} />
        <TopAccounts data={data} />
      </div>
    </section>
  );
}
