"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { deleteBudgetAction } from "@/app/actions/budgets";
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
import type { BudgetDTO } from "@/lib/services/budgets";
import { cn } from "@/lib/utils";

export function DeleteBudgetDialog({
  budget,
  open,
  onOpenChange,
}: {
  budget: BudgetDTO | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const confirm = async () => {
    if (!budget) return;
    setPending(true);
    const result = await deleteBudgetAction(budget.id);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Budget supprimé avec succès.");
    onOpenChange(false);
    router.refresh();
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer ce budget ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le budget « {budget?.name} » sera définitivement supprimé.
            L&apos;historique des transactions et des notifications est conservé.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(event) => {
              event.preventDefault();
              void confirm();
            }}
            disabled={pending}
            className={cn(buttonVariants({ variant: "destructive" }))}
          >
            {pending ? "Suppression…" : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
