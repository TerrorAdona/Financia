import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildSystemPrompt,
  type FinanceSnapshot,
} from "@/lib/services/assistant";

const snapshot: FinanceSnapshot = {
  devise: "MGA",
  soldeTotal: 500000,
  comptes: [{ nom: "MVola", type: "MOBILE_MONEY", solde: 500000 }],
  transactionsRecentes: [],
  budgetsMois: [],
  objectifs: [],
  notificationsNonLues: 0,
};

describe("buildSystemPrompt", () => {
  it("injecte les données et verrouille le périmètre", () => {
    const prompt = buildSystemPrompt(snapshot);
    assert.ok(prompt.includes("MVola"));
    assert.ok(prompt.includes("500000"));
    assert.ok(prompt.includes("Ariary"));
    assert.ok(prompt.includes("PÉRIMÈTRE STRICT"));
    assert.ok(prompt.includes("Financia"));
  });
});
