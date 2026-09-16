import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_TYPE_LABELS,
  CURRENCY_LABELS,
  formatMoney,
} from "@/lib/money";

describe("formatMoney", () => {
  it("formate les Ariary sans décimales", () => {
    const out = formatMoney(1_500_000, "MGA");
    assert.ok(out.includes("Ar"));
    assert.equal(out.replace(/\D/g, ""), "1500000");
  });

  it("formate l'euro avec décimales", () => {
    const out = formatMoney(1234.5, "EUR");
    assert.ok(out.includes("€"));
  });

  it("formate le dollar", () => {
    const out = formatMoney(99.99, "USD");
    assert.ok(out.includes("$"));
  });

  it("accepte les montants en chaîne", () => {
    assert.equal(
      formatMoney("100", "MGA").replace(/\D/g, ""),
      "100",
    );
  });

  it("retourne un tiret pour les montants invalides", () => {
    assert.equal(formatMoney(Number.NaN, "MGA"), "—");
    assert.equal(formatMoney("abc", "EUR"), "—");
  });

  it("couvre les trois devises et les types de compte", () => {
    assert.deepEqual(Object.keys(CURRENCY_LABELS).sort(), ["EUR", "MGA", "USD"]);
    assert.ok(ACCOUNT_TYPE_LABELS.BANK.length > 0);
  });
});
