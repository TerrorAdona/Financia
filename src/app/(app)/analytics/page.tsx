import type { Metadata } from "next";
import Link from "next/link";
import { ChartColumn, Plus } from "lucide-react";

import { AnalyticsEvolution } from "@/components/analytics/analytics-evolution";
import { AnalyticsKpis } from "@/components/analytics/analytics-kpis";
import { CategoryMix } from "@/components/analytics/category-mix";
import { PeriodComparison } from "@/components/analytics/period-comparison";
import { buttonVariants } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-helpers";
import {
  getAnalyticsData,
  parseAnalyticsPeriod,
} from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Analyses",
  description: "Analysez vos finances par période.",
};

export default async function AnalysesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const userId = await requireUserId();
  const params = await searchParams;
  const data = await getAnalyticsData(userId, parseAnalyticsPeriod(params.period));

  if (!data) {
    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
          <ChartColumn className="size-7 text-muted-foreground" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Analyses</h1>
          <p className="max-w-md text-muted-foreground">
            Créez un compte et enregistrez des transactions pour voir ici vos
            analyses financières.
          </p>
        </div>
        <Link href="/accounts" className={cn(buttonVariants({ size: "lg" }))}>
          <Plus className="size-4" aria-hidden="true" />
          Créer un compte
        </Link>
      </section>
    );
  }

  if (!data.hasData) {
    return (
      <section className="flex flex-1 flex-col gap-4 sm:gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyses</h1>
          <p className="text-muted-foreground">
            Aucune transaction sur les périodes analysées pour le moment.
          </p>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <p className="max-w-sm text-sm text-muted-foreground">
            Enregistrez votre première transaction pour débloquer les
            graphiques et indicateurs.
          </p>
          <Link href="/transactions" className={cn(buttonVariants())}>
            <Plus className="size-4" aria-hidden="true" />
            Nouvelle transaction
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analyses</h1>
          <p className="text-muted-foreground">
            Indicateurs et tendances {data.periodLabel} en{" "}
            {data.currency === "MGA" ? "Ariary" : data.currency}.
          </p>
        </div>
      </div>

      {data.excludedAccounts > 0 ? (
        <p className="rounded-lg border px-3 py-2 text-sm text-muted-foreground" role="note">
          {data.excludedAccounts} compte(s) dans une autre devise exclus des
          calculs.
        </p>
      ) : null}

      <AnalyticsKpis data={data} />

      <AnalyticsEvolution data={data} />

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
        <CategoryMix data={data} />
        <PeriodComparison data={data} />
      </div>
    </section>
  );
}
