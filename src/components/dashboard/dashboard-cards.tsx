import { Percent, PiggyBank, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Currency } from "@/lib/account-schemas";
import { formatMoney } from "@/lib/money";
import type { DashboardData } from "@/lib/services/dashboard";

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
  iconClassName,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Wallet;
  iconClassName?: string;
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
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function DashboardCards({ data }: { data: DashboardData }) {
  const { totals, currency } = data;
  const rate = totals.savingsRate;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        title="Solde total"
        value={formatMoney(totals.balance, currency as Currency)}
        hint="Tous comptes confondus"
        icon={Wallet}
      />
      <StatCard
        title="Revenus du mois"
        value={formatMoney(totals.incomeMonth, currency as Currency)}
        hint="Mois en cours"
        icon={TrendingUp}
        iconClassName="text-green-600 dark:text-green-400"
      />
      <StatCard
        title="Dépenses du mois"
        value={formatMoney(totals.expensesMonth, currency as Currency)}
        hint="Mois en cours"
        icon={TrendingDown}
        iconClassName="text-destructive"
      />
      <StatCard
        title="Épargne"
        value={formatMoney(totals.savings, currency as Currency)}
        hint="Comptes d'épargne"
        icon={PiggyBank}
      />
      <StatCard
        title="Taux d'épargne"
        value={rate === null ? "—" : `${(rate * 100).toFixed(1).replace(".", ",")} %`}
        hint={rate === null ? "Aucun revenu ce mois-ci" : "Net du mois / revenus"}
        icon={Percent}
      />
    </div>
  );
}
