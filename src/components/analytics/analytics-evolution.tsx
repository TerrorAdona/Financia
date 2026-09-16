"use client";

import Link from "next/link";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Currency } from "@/lib/account-schemas";
import { formatMoney } from "@/lib/money";
import {
  ANALYTICS_PERIODS,
  type AnalyticsData,
  type AnalyticsPoint,
} from "@/lib/services/analytics";
import { cn } from "@/lib/utils";

const PERIOD_LABELS: Record<AnalyticsData["period"], string> = {
  "1m": "Mois",
  "3m": "3 mois",
  "6m": "6 mois",
  "1y": "Année",
};

const compact = new Intl.NumberFormat("fr-FR", { notation: "compact" });

type TooltipEntry = {
  name?: string;
  value?: number | string;
  dataKey?: string | number;
};

function AnalyticsTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
  currency: Currency;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const byKey = new Map(payload.map((p) => [String(p.dataKey), p]));
  const rows = [
    { key: "income", label: "Revenus", color: "#16a34a" },
    { key: "expenses", label: "Dépenses", color: "#dc2626" },
    { key: "savings", label: "Épargne nette", color: "#6366f1" },
  ];
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="mb-1 font-medium">{label}</p>
      {rows.map((row) => {
        const entry = byKey.get(row.key);
        if (!entry || typeof entry.value !== "number") return null;
        return (
          <p key={row.key} className="flex items-center justify-between gap-6 tabular-nums">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
              {row.label}
            </span>
            <span className="font-medium">{formatMoney(entry.value, currency)}</span>
          </p>
        );
      })}
    </div>
  );
}

export function AnalyticsEvolution({ data }: { data: AnalyticsData }) {
  const currency = data.currency as Currency;
  const hasValues = data.points.some((p) => p.income !== 0 || p.expenses !== 0);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Évolution financière</CardTitle>
          <CardDescription>
            Revenus, dépenses et épargne nette ({data.periodLabel})
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Période">
          {ANALYTICS_PERIODS.map((p) => (
            <Link
              key={p}
              href={p === "6m" ? "/analytics" : `/analytics?period=${p}`}
              scroll={false}
              role="tab"
              aria-selected={p === data.period}
              className={cn(buttonVariants({ variant: p === data.period ? "default" : "ghost", size: "sm" }))}
            >
              {PERIOD_LABELS[p]}
            </Link>
          ))}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {!hasValues ? (
          <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Aucune transaction sur cette période.
          </p>
        ) : (
          <div className="h-72 w-full text-muted-foreground sm:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data.points} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="currentColor" strokeOpacity={0.15} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                />
                <YAxis
                  tick={{ fill: "currentColor", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={(v: number) => compact.format(v)}
                />
                <Tooltip
                  content={<AnalyticsTooltip currency={currency} />}
                  cursor={{ stroke: "currentColor", strokeOpacity: 0.3 }}
                />
                <Area
                  type="monotone"
                  dataKey="income"
                  name="Revenus"
                  stroke="#16a34a"
                  fill="#16a34a"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
                <Area
                  type="monotone"
                  dataKey="expenses"
                  name="Dépenses"
                  stroke="#dc2626"
                  fill="#dc2626"
                  fillOpacity={0.15}
                  strokeWidth={2}
                  dot={false}
                />
                <Bar dataKey="savings" name="Épargne nette" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={22} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="mt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              {[
                { label: "Revenus", color: "#16a34a" },
                { label: "Dépenses", color: "#dc2626" },
                { label: "Épargne nette", color: "#6366f1" },
              ].map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export type { AnalyticsPoint };
