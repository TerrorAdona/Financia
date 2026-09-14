import { APP_NAME } from "@/constants/app";

export function Footer() {
  return (
    <footer className="w-full border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <p>
          © {new Date().getFullYear()} {APP_NAME}. Tous droits réservés.
        </p>
        <p>Projet initialisé avec Next.js, Tailwind CSS et shadcn/ui.</p>
      </div>
    </footer>
  );
}
