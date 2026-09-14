import { LogOut } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { requireUserId } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

/**
 * Tableau de bord minimal — prouve la session et l'isolation des données.
 * Toutes les requêtes sont filtrées par `userId` de la session.
 * Les fonctionnalités financières seront développées ultérieurement.
 */
export default async function DashboardPage() {
  const userId = await requireUserId();

  const [user, accountCount, transactionCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true, name: true, email: true },
    }),
    prisma.account.count({ where: { userId } }),
    prisma.transaction.count({ where: { userId } }),
  ]);

  const displayName =
    user?.name ??
    `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ??
    user?.email;

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bonjour{displayName ? `, ${displayName}` : ""} 👋
          </h1>
          <p className="text-muted-foreground">
            Connecté en tant que {user?.email} — vos données sont isolées par
            compte.
          </p>
        </div>
        <form action={logoutAction}>
          <Button variant="outline" type="submit">
            <LogOut className="size-4" aria-hidden="true" />
            Déconnexion
          </Button>
        </form>
      </div>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Comptes</dt>
          <dd className="mt-1 text-2xl font-bold">{accountCount}</dd>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <dt className="text-sm text-muted-foreground">Transactions</dt>
          <dd className="mt-1 text-2xl font-bold">{transactionCount}</dd>
        </div>
      </dl>

      <p className="text-sm text-muted-foreground">
        Page protégée : accessible uniquement aux utilisateurs connectés. Les
        graphiques et la gestion financière seront construits dans les
        prochaines étapes.
      </p>
    </section>
  );
}
