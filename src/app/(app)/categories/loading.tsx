import { Skeleton } from "@/components/ui/skeleton";

export default function CategoriesLoading() {
  return (
    <section
      className="flex flex-1 flex-col gap-6"
      aria-busy="true"
      aria-label="Chargement des catégories"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-44" />
          <Skeleton className="h-5 w-56" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <div key={col} className="flex flex-col gap-3">
            <Skeleton className="h-5 w-32" />
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border p-3"
              >
                <Skeleton className="size-10 rounded-xl" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
