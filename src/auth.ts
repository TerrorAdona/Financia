import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { loginSchema } from "@/lib/auth-schemas";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}

/**
 * Vérifie des identifiants email/mot de passe (exporté pour les tests).
 * Retourne le profil de session ou null si invalide.
 */
export async function authorizeCredentials(credentials: unknown): Promise<{
  id: string;
  email: string;
  name: string | null;
} | null> {
  const parsed = loginSchema.safeParse(credentials);
  if (!parsed.success) return null;

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user?.passwordHash) return null;

  const valid = await verifyPassword(
    parsed.data.password,
    user.passwordHash,
  );
  if (!valid) return null;

  const displayName =
    (user.name ?? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()) ||
    null;

  return {
    id: user.id,
    email: user.email,
    name: displayName,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.id) (token as unknown as { id: string }).id = user.id;
      return token;
    },
    async session({ session, token }) {
      const id = (token as unknown as { id?: string }).id;
      if (session.user && id) session.user.id = id;
      return session;
    },
  },
});
