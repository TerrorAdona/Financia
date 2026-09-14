import { cn } from "@/lib/utils";

export const inputClassName =
  "flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive";

/** Message d'erreur de champ (compatible FieldError RHF et unions Zod). */
export type FieldMessage = {
  message?: string;
};

export function Field({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: FieldMessage;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {children}
      {error?.message ? (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive",
      )}
    >
      {message}
    </p>
  );
}
