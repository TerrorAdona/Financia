import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Retourne l'id de l'utilisateur connecté, sinon redirige vers /login.
 * À utiliser dans chaque Server Component / Server Action accédant aux
 * données : garantit qu'un utilisateur ne voit que ses propres données
 * (`where: { userId }`).
 */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/login");
  return id;
}

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}
