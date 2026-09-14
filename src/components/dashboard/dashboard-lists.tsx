import Link from "next/link";
import { ArrowRight, Crown, ReceiptText, TrendingUp } from "lucide-react";

import { AccountTypeIcon } from "@/components/accounts/account-type-icon";
import { CategoryIcon } from "@/components/categories/category-icon";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatShortDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { Currency } from "@/lib/account-schemas";
import type { DashboardData } from "@/lib/services/dashboard";
import type { AccountType } from "@prisma/client";
import { cn } from "@/lib/utils";

export function LatestTransactions({ data }: { data: DashboardData }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Dernières transactions</CardTitle>
        <Link
          href="/transactions"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Tout voir
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        {data.latest.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Aucune transaction pour le moment.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {data.latest.map((t) => (
              <li key={t.id} className="flex items-center gap-3 py-2.5">
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${t.categoryColor}1a` }}
                >
                  <ReceiptText
                    className="size-4"
                    style={{ color: t.categoryColor }}
                    aria-hidden="true"
                  />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{t.description}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {t.categoryName ?? (t.type === "TRANSFER" ? "Transfert" : "—")}
                    {" · "}
                    {t.accountName}
                    {" · "}
                    {formatShortDate(t.date)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 text-sm font-semibold tabular-nums",
                    t.type === "INCOME" && "text-green-600 dark:text-green-400",
                    t.type === "EXPENSE" && "text-destructive",
                  )}
                >
                  {t.type === "INCOME" ? "+" : t.type === "EXPENSE" ? "−" : ""}
                  {formatMoney(t.amount, t.accountCurrency as Currency)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function TopAccounts({ data }: { data: DashboardData }) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Comptes principaux</CardTitle>
        <Link
          href="/accounts"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Tout voir
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {data.topAccounts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
                <AccountTypeIcon
                  type={a.type as AccountType}
                  className="size-4 text-muted-foreground"
                />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{a.name}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {formatMoney(a.balance, a.currency as Currency)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function Highlights({ data }: { data: DashboardData }) {
  const cur = data.currency as Currency;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <Crown className="size-4 text-amber-500" aria-hidden="true" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Catégorie la plus dépensée
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topCategory ? (
            <div className="flex items-center gap-3">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${data.topCategory.color}1a` }}
              >
                <CategoryIcon
                  name={data.topCategory.icon}
                  className="size-5"
                  style={{ color: data.topCategory.color }}
                />
              </span>
              <div>
                <p className="font-semibold">{data.topCategory.name}</p>
                <p className="text-sm tabular-nums text-muted-foreground">
                  {formatMoney(data.topCategory.amount, cur)} ce mois-ci
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune dépense ce mois-ci.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2">
          <TrendingUp className="size-4 text-destructive" aria-hidden="true" />
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Plus grosse dépense
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.biggestExpense ? (
            <div>
              <p className="truncate font-semibold">{data.biggestExpense.description}</p>
              <p className="text-sm tabular-nums text-muted-foreground">
                {formatMoney(data.biggestExpense.amount, cur)}
                {" · "}
                {data.biggestExpense.categoryName ?? "Sans catégorie"}
                {" · "}
                {formatShortDate(data.biggestExpense.date)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune dépense ce mois-ci.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
