import {
  CalendarClock,
  Crown,
  Percent,
  ReceiptText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import { CategoryIcon } from "@/components/categories/category-icon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Currency } from "@/lib/account-schemas";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { AnalyticsData } from "@/lib/services/analytics";

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  iconClassName,
  children,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
  iconClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <span className="flex size-8 items-center justify-center rounded-lg bg-muted">
          <Icon className={`size-4 ${iconClassName ?? "text-muted-foreground"}`} aria-hidden="true" />
        </span>
      </CardHeader>
      <CardContent>
        <p className="truncate text-2xl font-bold tracking-tight tabular-nums" title={value}>
          {value}
        </p>
        <p className="mt-1 truncate text-xs text-muted-foreground" title={hint}>
          {hint}
        </p>
        {children}
      </CardContent>
    </Card>
  );
}

export function AnalyticsKpis({ data }: { data: AnalyticsData }) {
  const cur = data.currency as Currency;
  const { kpis } = data;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <KpiCard
        title="Revenu total"
        value={formatMoney(kpis.income, cur)}
        hint={`Sur ${data.periodLabel}`}
        icon={TrendingUp}
        iconClassName="text-green-600 dark:text-green-400"
      />
      <KpiCard
        title="Dépense totale"
        value={formatMoney(kpis.expenses, cur)}
        hint={`Sur ${data.periodLabel}`}
        icon={TrendingDown}
        iconClassName="text-destructive"
      />
      <KpiCard
        title="Taux d'épargne"
        value={
          kpis.savingsRate === null
            ? "—"
            : `${(kpis.savingsRate * 100).toFixed(1).replace(".", ",")} %`
        }
        hint={
          kpis.savingsRate === null
            ? "Aucun revenu sur la période"
            : `${formatMoney(kpis.savings, cur)} épargnés`
        }
        icon={Percent}
      />
      <KpiCard
        title="Dépense moyenne / jour"
        value={formatMoney(kpis.avgDailyExpense, cur)}
        hint={`Sur ${data.days} jour(s)`}
        icon={CalendarClock}
      />
      <KpiCard
        title="Catégorie la plus dépensée"
        value={kpis.topCategory?.name ?? "—"}
        hint={
          kpis.topCategory
            ? formatMoney(kpis.topCategory.amount, cur)
            : "Aucune dépense"
        }
        icon={Crown}
        iconClassName="text-amber-500"
      >
        {kpis.topCategory ? (
          <CategoryIcon
            name={kpis.topCategory.icon}
            className="mt-2 size-5"
            style={{ color: kpis.topCategory.color }}
          />
        ) : null}
      </KpiCard>
      <KpiCard
        title="Plus grosse dépense"
        value={kpis.biggestExpense ? formatMoney(kpis.biggestExpense.amount, cur) : "—"}
        hint={
          kpis.biggestExpense
            ? `${kpis.biggestExpense.description} · ${formatShortDate(kpis.biggestExpense.date)}`
            : "Aucune dépense"
        }
        icon={ReceiptText}
      />
    </div>
  );
}
