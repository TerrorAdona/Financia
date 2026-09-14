"use client";

import Link from "next/link";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

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
import type { CategorySlice } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

type PieEntry = {
  name?: string;
  value?: number | string;
  payload?: CategorySlice & { percent?: number };
};

function PieTooltip({
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

export function ExpensesPie({
  slices,
  currency,
}: {
  slices: CategorySlice[];
  currency: string;
}) {
  const cur = currency as Currency;
  const total = slices.reduce((s, x) => s + x.amount, 0);

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Dépenses par catégorie</CardTitle>
        <CardDescription>Répartition du mois en cours</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        {slices.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-8 text-sm text-muted-foreground">
            Aucune dépense ce mois-ci.
          </p>
        ) : (
          <>
            <div className="h-52 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip content={<PieTooltip currency={cur} />} />
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
            <ul className="flex flex-col gap-2">
              {slices.slice(0, 5).map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="min-w-0 flex-1 truncate">{s.name}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {total > 0 ? Math.round((s.amount / total) * 100) : 0} %
                  </span>
                  <span className="w-28 text-right font-medium tabular-nums">
                    {formatMoney(s.amount, cur)}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/categories"
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-auto")}
            >
              Gérer les catégories
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
