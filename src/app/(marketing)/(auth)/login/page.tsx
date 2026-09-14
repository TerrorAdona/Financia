import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Connexion",
  description: "Connectez-vous à votre espace Financia.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string }>;
}) {
  const session = await auth();
  if (session?.user?.id) redirect("/dashboard");

  const { registered } = await searchParams;

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-12">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Connexion</h1>
        <p className="text-muted-foreground">
          Accédez à votre espace de gestion financière.
        </p>
      </div>

      {registered === "1" ? (
        <p
          role="status"
          className="rounded-lg border border-green-600/50 bg-green-600/10 px-3 py-2 text-sm text-green-700 dark:text-green-400"
        >
          Compte créé avec succès. Connectez-vous pour continuer.
        </p>
      ) : null}

      <LoginForm />

      <p className="text-center text-sm text-muted-foreground">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">
          Créer un compte
        </Link>
      </p>
    </section>
  );
}
