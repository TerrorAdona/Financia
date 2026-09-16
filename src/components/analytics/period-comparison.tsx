import { Minus, TrendingDown, TrendingUp } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Currency } from "@/lib/account-schemas";
import { formatMoney } from "@/lib/money";
import type { AnalyticsData, Comparison } from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

function DeltaBadge({
  delta,
  invert,
}: {
  delta: number | null;
  /** true si une hausse est une mauvaise nouvelle (dépenses). */
  invert?: boolean;
}) {
  if (delta === null) {
    return (
      <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <Minus className="size-4" aria-hidden="true" />—
      </span>
    );
  }
  const up = delta > 0;
  const flat = delta === 0;
  const good = flat ? null : up !== !!invert;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-sm font-medium tabular-nums",
        good === null && "text-muted-foreground",
        good === true && "text-green-600 dark:text-green-400",
        good === false && "text-destructive",
      )}
    >
      {flat ? (
        <Minus className="size-4" aria-hidden="true" />
      ) : up ? (
        <TrendingUp className="size-4" aria-hidden="true" />
      ) : (
        <TrendingDown className="size-4" aria-hidden="true" />
      )}
      {up ? "+" : ""}
      {(delta * 100).toFixed(1).replace(".", ",")} %
    </span>
  );
}

function ComparisonRow({
  label,
  comparison,
  currency,
  invert,
}: {
  label: string;
  comparison: Comparison;
  currency: Currency;
  invert?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 items-center gap-2 py-3 sm:grid-cols-4">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-sm tabular-nums sm:text-right">
        {formatMoney(comparison.current, currency)}
      </p>
      <p className="text-sm tabular-nums text-muted-foreground sm:text-right">
        {formatMoney(comparison.previous, currency)}
      </p>
      <div className="sm:text-right">
        <DeltaBadge delta={comparison.delta} invert={invert} />
      </div>
    </div>
  );
}

export function PeriodComparison({ data }: { data: AnalyticsData }) {
  const cur = data.currency as Currency;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparaison avec la période précédente</CardTitle>
        <CardDescription>
          {data.periodLabel} vs période équivalente précédente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-1 hidden grid-cols-4 gap-2 text-xs text-muted-foreground uppercase sm:grid">
          <span>Indicateur</span>
          <span className="text-right">Période</span>
          <span className="text-right">Précédente</span>
          <span className="text-right">Évolution</span>
        </div>
        <div className="divide-y divide-border">
          <ComparisonRow label="Revenus" comparison={data.comparison.income} currency={cur} />
          <ComparisonRow label="Dépenses" comparison={data.comparison.expenses} currency={cur} invert />
          <ComparisonRow label="Épargne nette" comparison={data.comparison.savings} currency={cur} />
        </div>
      </CardContent>
    </Card>
  );
}
