"use client";

import { CircleAlert } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function TransfersError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Erreur page Transferts :", error);
  }, [error]);

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-destructive/10">
        <CircleAlert className="size-7 text-destructive" aria-hidden="true" />
      </span>
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">Une erreur est survenue</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Impossible d&apos;afficher vos transferts pour le moment.
        </p>
      </div>
      <Button type="button" variant="outline" onClick={() => reset()}>
        Réessayer
      </Button>
    </section>
  );
}
