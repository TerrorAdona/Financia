import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { zodResolver } from "@hookform/resolvers/zod";

import { editAccountSchema } from "@/lib/account-schemas";
import { editBudgetSchema, updateBudgetSchema } from "@/lib/budget-schemas";
import { editCategorySchema } from "@/lib/category-schemas";
import { editGoalSchema, createGoalSchema } from "@/lib/goal-schemas";
import { editTransactionSchema } from "@/lib/transaction-schemas";

const cuid = `c${"a".repeat(24)}`;

/**
 * Non-régression : les formulaires d'édition valident des valeurs SANS `id`
 * (l'`id` est ajouté seulement à l'appel de l'action, depuis les props).
 * Valider avec le schéma `update` complet rejetait le formulaire à cause
 * du champ invisible `id` → `handleSubmit` n'appelait jamais `onSubmit`
 * et le bouton « Enregistrer » semblait ne rien faire.
 */
async function resolveErrors(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolver: any,
  values: unknown,
): Promise<Record<string, unknown>> {
  const result = await resolver(values, undefined, {
    fields: {},
    shouldUseNativeValidation: false,
  });
  return result.errors as Record<string, unknown>;
}

describe("schémas d'édition (sans id)", () => {
  it("budget : valeurs d'édition valides", async () => {
    const values = {
      name: "Alimentation",
      categoryId: cuid,
      month: "2026-09",
      amountLimit: 600000,
    };
    assert.deepEqual(
      await resolveErrors(zodResolver(editBudgetSchema), values),
      {},
    );
    // Et le schéma `update` complet les rejetterait (champ `id` manquant).
    const buggy = await resolveErrors(zodResolver(updateBudgetSchema), values);
    assert.ok("id" in buggy, "le schéma update exige id");
  });

  it("catégorie : valeurs d'édition valides", async () => {
    assert.deepEqual(
      await resolveErrors(
        zodResolver(editCategorySchema),
        { name: "Cantine", type: "EXPENSE", icon: "Tag", color: "#64748b" },
      ),
      {},
    );
  });

  it("compte : valeurs d'édition valides", async () => {
    assert.deepEqual(
      await resolveErrors(
        zodResolver(editAccountSchema),
        { name: "MVola", type: "MOBILE_MONEY", currency: "MGA", balance: 1000 },
      ),
      {},
    );
  });

  it("objectif : valeurs d'édition valides, y compris date passée", async () => {
    const overdue = {
      name: "Moto",
      description: "",
      targetAmount: 1000000,
      currentAmount: 100000,
      deadline: "2020-05-01",
    };
    assert.deepEqual(
      await resolveErrors(zodResolver(editGoalSchema), overdue),
      {},
    );
    // La création, elle, refuse toujours une date passée.
    assert.ok("deadline" in (await resolveErrors(zodResolver(createGoalSchema), overdue)));
  });

  it("transaction : édition dépense et transfert valides", async () => {
    const cuidB = `c${"b".repeat(24)}`;
    assert.deepEqual(
      await resolveErrors(
        zodResolver(editTransactionSchema),
        {
          description: "Marché",
          amount: 85000,
          type: "EXPENSE",
          accountId: cuid,
          categoryId: cuidB,
          date: new Date(),
        },
      ),
      {},
    );
    assert.deepEqual(
      await resolveErrors(
        zodResolver(editTransactionSchema),
        {
          description: "Retrait",
          amount: 200000,
          type: "TRANSFER",
          accountId: cuid,
          toAccountId: cuidB,
          date: new Date(),
        },
      ),
      {},
    );
  });
});
