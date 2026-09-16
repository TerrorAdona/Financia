"use client";

import { TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { deleteAccountAction } from "@/app/actions/settings";
import { Field, FormError, inputClassName } from "@/components/auth/form-fields";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ERASED_DATA = [
  "comptes et soldes",
  "transactions",
  "catégories",
  "budgets",
  "objectifs d'épargne",
  "notifications",
  "demandes de transfert",
];

/**
 * Confirmation forte : l'utilisateur retape son email (comparé à
 * l'email actuel côté client ET serveur) + son mot de passe actuel
 * (vérifié en bcrypt côté serveur). Irréversible, cascade Prisma.
 */
export function DeleteAccountDialog({
  currentEmail,
  open,
  onOpenChange,
}: {
  currentEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const emailMatches =
    email.trim().toLowerCase() === currentEmail.trim().toLowerCase();
  const canConfirm = emailMatches && password.length > 0 && !pending;

  const close = (next: boolean) => {
    if (!next && !pending) {
      setEmail("");
      setPassword("");
      setServerError(null);
    }
    onOpenChange(next);
  };

  const confirm = async () => {
    if (!canConfirm) return;
    setPending(true);
    setServerError(null);
    const result = await deleteAccountAction({ email, password });
    // Succès : l'action déconnecte (redirect) et ne résout jamais ici.
    setPending(false);
    if (result.error) {
      setServerError(result.error);
      toast.error(result.error);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={close}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <TriangleAlert className="size-5 text-destructive" aria-hidden="true" />
            Supprimer définitivement votre compte ?
          </AlertDialogTitle>
          <AlertDialogDescription>
            Cette action est irréversible. Seront effacés :{" "}
            {ERASED_DATA.join(", ")}.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          <Field id="delete-email" label={`Tapez votre email (${currentEmail})`}>
            <input
              id="delete-email"
              type="email"
              autoComplete="email"
              placeholder={currentEmail}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={pending}
              className={inputClassName}
              aria-invalid={email.length > 0 && !emailMatches}
            />
          </Field>
          {email.length > 0 && !emailMatches ? (
            <p role="alert" className="-mt-2 text-sm text-destructive">
              L&apos;email saisi ne correspond pas.
            </p>
          ) : null}

          <Field id="delete-password" label="Mot de passe actuel">
            <input
              id="delete-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
              className={inputClassName}
            />
          </Field>

          <FormError message={serverError} />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
            disabled={!canConfirm}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {pending ? "Suppression…" : "Supprimer définitivement"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
