import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  recipientSearchSchema,
  requestTransferSchema,
  transferDecisionSchema,
} from "@/lib/transfer-schemas";

const cuidA = `c${"a".repeat(24)}`;
const cuidB = `c${"b".repeat(24)}`;

describe("requestTransferSchema", () => {
  it("accepte une demande valide", () => {
    assert.equal(
      requestTransferSchema.safeParse({
        fromAccountId: cuidA,
        toAccountId: cuidB,
        amount: 500_000,
      }).success,
      true,
    );
  });

  it("refuse même compte et montant nul", () => {
    assert.equal(
      requestTransferSchema.safeParse({
        fromAccountId: cuidA,
        toAccountId: cuidA,
        amount: 100,
      }).success,
      false,
    );
    assert.equal(
      requestTransferSchema.safeParse({
        fromAccountId: cuidA,
        toAccountId: cuidB,
        amount: 0,
      }).success,
      false,
    );
  });
});

describe("transferDecisionSchema / recipientSearchSchema", () => {
  it("exige un cuid pour les décisions", () => {
    assert.equal(transferDecisionSchema.safeParse({ id: cuidA }).success, true);
    assert.equal(transferDecisionSchema.safeParse({ id: "nope" }).success, false);
  });

  it("exige 2 caractères minimum pour la recherche", () => {
    assert.equal(recipientSearchSchema.safeParse({ q: "ai" }).success, true);
    assert.equal(recipientSearchSchema.safeParse({ q: "x" }).success, false);
  });
});
