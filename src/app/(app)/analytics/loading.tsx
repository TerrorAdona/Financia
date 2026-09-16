import { Skeleton } from "@/components/ui/skeleton";

export default function AnalysesLoading() {
  return (
    <section
      className="flex flex-1 flex-col gap-4 sm:gap-6"
      aria-busy="true"
      aria-label="Chargement des analyses"
    >
      <div className="flex flex-col gap-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-5 w-72" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex flex-col gap-2 rounded-xl border p-6">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        ))}
      </div>
      <Skeleton className="h-80 w-full rounded-xl" />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Skeleton className="h-96 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    </section>
  );
}
