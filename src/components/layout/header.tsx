import Link from "next/link";
import { LayoutDashboard, Wallet } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { auth } from "@/auth";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/constants/app";
import { cn } from "@/lib/utils";

export async function Header() {
  const session = await auth();
  const loggedIn = !!session?.user?.id;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" aria-hidden="true" />
          </span>
          {APP_NAME}
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          <ThemeToggle />
          {loggedIn ? (
            <>
              <Link
                href="/dashboard"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                <LayoutDashboard className="size-4" aria-hidden="true" />
                Tableau de bord
              </Link>
              <form action={logoutAction}>
                <Button variant="outline" size="sm" type="submit">
                  Déconnexion
                </Button>
              </form>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Connexion
              </Link>
              <Link
                href="/register"
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Inscription
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
