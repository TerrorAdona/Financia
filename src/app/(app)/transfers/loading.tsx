import { Skeleton } from "@/components/ui/skeleton";

/** État loading : squelettes pendant le chargement serveur. */
export default function TransfersLoading() {
  return (
    <section
      className="flex flex-1 flex-col gap-6"
      aria-label="Chargement des transferts"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>
      <Skeleton className="h-6 w-64" />
      <ul className="flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex gap-3 rounded-xl border p-4">
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-8 w-48" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
