import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { createTransactionSchema } from "@/lib/transaction-schemas";

const cuidA = `c${"a".repeat(24)}`;
const cuidB = `c${"b".repeat(24)}`;

const baseExpense = {
  description: "Marché",
  amount: 85_000,
  type: "EXPENSE",
  accountId: cuidA,
  categoryId: cuidB,
  date: new Date(),
} as const;

describe("createTransactionSchema", () => {
  it("accepte une dépense valide", () => {
    assert.equal(
      createTransactionSchema.safeParse({ ...baseExpense }).success,
      true,
    );
  });

  it("exige une catégorie hors transfert", () => {
    assert.equal(
      createTransactionSchema.safeParse({ ...baseExpense, categoryId: "" }).success,
      false,
    );
  });

  it("valide les règles de transfert", () => {
    const transfer = {
      description: "MVola vers espèces",
      amount: 200_000,
      type: "TRANSFER",
      accountId: cuidA,
      toAccountId: cuidB,
      date: new Date(),
    };
    assert.equal(createTransactionSchema.safeParse(transfer).success, true);
    // Même compte source/destination.
    assert.equal(
      createTransactionSchema.safeParse({ ...transfer, toAccountId: cuidA }).success,
      false,
    );
    // Destinataire manquant.
    assert.equal(
      createTransactionSchema.safeParse({ ...transfer, toAccountId: "" }).success,
      false,
    );
    // Catégorie sur transfert : acceptée par Zod mais ignorée côté
    // service (categoryId forcé à null pour TRANSFER).
    assert.equal(
      createTransactionSchema.safeParse({ ...transfer, categoryId: cuidB }).success,
      true,
    );
    // Destinataire interdit hors transfert.
    assert.equal(
      createTransactionSchema.safeParse({ ...baseExpense, toAccountId: cuidB }).success,
      false,
    );
  });

  it("refuse montant nul et date future", () => {
    assert.equal(
      createTransactionSchema.safeParse({ ...baseExpense, amount: 0 }).success,
      false,
    );
    assert.equal(
      createTransactionSchema.safeParse({
        ...baseExpense,
        date: new Date(Date.now() + 3 * 86_400_000),
      }).success,
      false,
    );
  });
});
