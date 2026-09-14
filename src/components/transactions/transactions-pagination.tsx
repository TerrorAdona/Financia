"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function pageHref(searchParams: URLSearchParams, page: number): string {
  const params = new URLSearchParams(searchParams.toString());
  params.set("page", String(page));
  return `?${params.toString()}`;
}

export function TransactionsPagination({
  page,
  totalPages,
  total,
  pageSize,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}) {
  const searchParams = useSearchParams();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
      <p className="text-sm text-muted-foreground" role="status">
        {total === 0
          ? "Aucun résultat"
          : `${from}–${to} sur ${total} transaction(s)`}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href={pageHref(searchParams, page - 1)}
          aria-disabled={page <= 1}
          tabIndex={page <= 1 ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page <= 1 && "pointer-events-none opacity-50",
          )}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
          Précédent
        </Link>
        <span className="text-sm text-muted-foreground">
          Page {page} / {totalPages}
        </span>
        <Link
          href={pageHref(searchParams, page + 1)}
          aria-disabled={page >= totalPages}
          tabIndex={page >= totalPages ? -1 : undefined}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            page >= totalPages && "pointer-events-none opacity-50",
          )}
        >
          Suivant
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
