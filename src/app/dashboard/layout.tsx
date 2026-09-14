import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Protection définitive des routes /dashboard/* : vérifie la session
 * côté serveur (JWT signé). Le proxy ne fait qu'un contrôle optimiste.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return <>{children}</>;
}
