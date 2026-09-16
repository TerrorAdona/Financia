import { Skeleton } from "@/components/ui/skeleton";

/** État loading : squelettes pendant le chargement serveur. */
export default function SettingsLoading() {
  return (
    <section
      className="flex flex-1 flex-col gap-6"
      aria-label="Chargement des paramètres"
      aria-busy="true"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </section>
  );
}
