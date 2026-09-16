import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  createAccountSchema,
  updateAccountSchema,
} from "@/lib/account-schemas";
import {
  createCategorySchema,
  DEFAULT_CATEGORIES,
} from "@/lib/category-schemas";

describe("createAccountSchema", () => {
  it("accepte un compte valide", () => {
    assert.equal(
      createAccountSchema.safeParse({
        name: "MVola",
        type: "MOBILE_MONEY",
        currency: "MGA",
        balance: 1000,
      }).success,
      true,
    );
  });

  it("refuse solde négatif, devise inconnue et nom trop court", () => {
    const base = { name: "MVola", type: "CASH", currency: "MGA", balance: 0 };
    assert.equal(
      createAccountSchema.safeParse({ ...base, balance: -1 }).success,
      false,
    );
    assert.equal(
      createAccountSchema.safeParse({ ...base, currency: "CHF" }).success,
      false,
    );
    assert.equal(
      createAccountSchema.safeParse({ ...base, name: "X" }).success,
      false,
    );
    assert.equal(
      updateAccountSchema.safeParse({ ...base, id: "nope" }).success,
      false,
    );
  });
});

describe("createCategorySchema", () => {
  it("accepte une catégorie valide et refuse couleur/icône invalides", () => {
    assert.equal(
      createCategorySchema.safeParse({
        name: "Alimentation",
        type: "EXPENSE",
        icon: "ShoppingCart",
        color: "#22c55e",
      }).success,
      true,
    );
    assert.equal(
      createCategorySchema.safeParse({
        name: "Alimentation",
        type: "EXPENSE",
        icon: "Inconnue",
        color: "#22c55e",
      }).success,
      false,
    );
    assert.equal(
      createCategorySchema.safeParse({
        name: "Alimentation",
        type: "EXPENSE",
        icon: "Tag",
        color: "rouge",
      }).success,
      false,
    );
    assert.equal(
      createCategorySchema.safeParse({
        name: "Alimentation",
        type: "TRANSFER",
        icon: "Tag",
        color: "#64748b",
      }).success,
      false,
    );
  });

  it("fournit un jeu de catégories par défaut non vide", () => {
    assert.ok(DEFAULT_CATEGORIES.length >= 10);
    assert.ok(DEFAULT_CATEGORIES.some((c) => c.type === "INCOME"));
    assert.ok(DEFAULT_CATEGORIES.some((c) => c.type === "EXPENSE"));
  });
});
