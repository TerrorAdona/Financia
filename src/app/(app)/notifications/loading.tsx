import { Skeleton } from "@/components/ui/skeleton";

/** État loading : squelettes pendant le chargement serveur. */
export default function NotificationsLoading() {
  return (
    <section
      className="flex flex-1 flex-col gap-6"
      aria-label="Chargement des notifications"
      aria-busy="true"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-20" />
      </div>
      <ul className="flex flex-col gap-3" aria-hidden="true">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="flex gap-3 rounded-xl border p-4"
          >
            <Skeleton className="size-10 shrink-0 rounded-xl" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
