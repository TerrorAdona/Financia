import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_TYPE_LABELS,
  CURRENCY_LABELS,
  formatMoney,
} from "@/lib/money";

describe("formatMoney (Ariary uniquement)", () => {
  it("formate les Ariary sans décimales", () => {
    const out = formatMoney(1_500_000, "MGA");
    assert.ok(out.includes("Ar"));
    assert.equal(out.replace(/\D/g, ""), "1500000");
  });

  it("accepte les montants en chaîne", () => {
    assert.equal(
      formatMoney("100", "MGA").replace(/\D/g, ""),
      "100",
    );
  });

  it("retourne un tiret pour les montants invalides", () => {
    assert.equal(formatMoney(Number.NaN, "MGA"), "—");
    assert.equal(formatMoney("abc", "MGA"), "—");
  });

  it("ne connaît que l'Ariary", () => {
    assert.deepEqual(CURRENCY_LABELS, { MGA: "Ariary (Ar)" });
    assert.ok(ACCOUNT_TYPE_LABELS.BANK.length > 0);
  });
});
