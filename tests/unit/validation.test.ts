import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { firstIssue } from "@/lib/validation";

describe("firstIssue", () => {
  it("retourne le premier message Zod", () => {
    assert.equal(
      firstIssue({ issues: [{ message: "Bonjour" }, { message: "Autre" }] }),
      "Bonjour",
    );
  });

  it("retourne le message par défaut sinon", () => {
    assert.equal(firstIssue({}), "Données invalides.");
    assert.equal(firstIssue({ issues: [] }), "Données invalides.");
    assert.equal(firstIssue({ issues: [{}] }), "Données invalides.");
    assert.equal(firstIssue(null), "Données invalides.");
    assert.equal(firstIssue("boom"), "Données invalides.");
  });
});
