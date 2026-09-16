import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  contributeGoalSchema,
  createGoalSchema,
} from "@/lib/goal-schemas";

const future = new Date(Date.now() + 30 * 86_400_000);

describe("createGoalSchema", () => {
  it("accepte un objectif valide", () => {
    assert.equal(
      createGoalSchema.safeParse({
        name: "Fonds d'urgence",
        description: "",
        targetAmount: 5_000_000,
        currentAmount: 0,
        deadline: future,
      }).success,
      true,
    );
  });

  it("refuse cible nulle, date passée et montant négatif", () => {
    const base = {
      name: "Moto",
      targetAmount: 1_000_000,
      currentAmount: 0,
      deadline: future,
    };
    assert.equal(
      createGoalSchema.safeParse({ ...base, targetAmount: 0 }).success,
      false,
    );
    assert.equal(
      createGoalSchema.safeParse({
        ...base,
        deadline: new Date(Date.now() - 30 * 86_400_000),
      }).success,
      false,
    );
    assert.equal(
      createGoalSchema.safeParse({ ...base, currentAmount: -5 }).success,
      false,
    );
  });
});

describe("contributeGoalSchema", () => {
  it("refuse les contributions nulles ou négatives", () => {
    const id = `c${"a".repeat(24)}`;
    assert.equal(
      contributeGoalSchema.safeParse({ id, amount: 100 }).success,
      true,
    );
    assert.equal(
      contributeGoalSchema.safeParse({ id, amount: 0 }).success,
      false,
    );
    assert.equal(
      contributeGoalSchema.safeParse({ id: "nope", amount: 100 }).success,
      false,
    );
  });
});
