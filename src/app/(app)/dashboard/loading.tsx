import { Skeleton } from "@/components/ui/skeleton";

/** État loading : squelettes pendant le chargement serveur. */
export default function DashboardLoading() {
  return (
    <section
      className="flex flex-1 flex-col gap-4 sm:gap-6"
      aria-label="Chargement du tableau de bord"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </section>
  );
}
