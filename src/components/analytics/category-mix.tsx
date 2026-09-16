"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { CategoryIcon } from "@/components/categories/category-icon";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import type { Currency } from "@/lib/account-schemas";
import { formatMoney } from "@/lib/money";
import type { AnalyticsData, AnalyticsSlice } from "@/lib/services/analytics";

type PieEntry = {
  name?: string;
  value?: number | string;
};

function MixTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: PieEntry[];
  currency: Currency;
}) {
  const entry = payload?.[0];
  if (!active || !entry || typeof entry.value !== "number") return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{entry.name}</p>
      <p className="tabular-nums text-muted-foreground">
        {formatMoney(entry.value, currency)}
      </p>
    </div>
  );
}

export function CategoryMix({ data }: { data: AnalyticsData }) {
  const cur = data.currency as Currency;
  const slices: AnalyticsSlice[] = data.categories;
  const max = slices[0]?.amount ?? 0;

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Dépenses par catégorie</CardTitle>
        <CardDescription>Répartition sur {data.periodLabel}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {slices.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
            Aucune dépense sur cette période.
          </p>
        ) : (
          <>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<MixTooltip currency={cur} />} />
                  <Pie
                    data={slices}
                    dataKey="amount"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="90%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {slices.map((s) => (
                      <Cell key={s.id} fill={s.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="flex flex-col gap-3">
              {slices.map((s) => (
                <li key={s.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    <CategoryIcon name={s.icon} className="size-4 shrink-0" style={{ color: s.color }} />
                    <span className="min-w-0 flex-1 truncate">{s.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {(s.share * 100).toFixed(0)} %
                    </span>
                    <span className="w-28 text-right font-medium tabular-nums">
                      {formatMoney(s.amount, cur)}
                    </span>
                  </div>
                  <Progress value={max > 0 ? (s.amount / max) * 100 : 0} aria-label={`${s.name} ${Math.round(s.share * 100)} %`}>
                    <ProgressTrack>
                      <ProgressIndicator style={{ backgroundColor: s.color }} />
                    </ProgressTrack>
                  </Progress>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
