import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  BUDGET_THRESHOLDS,
  currentMonth,
  monthLabel,
  monthToRange,
} from "@/lib/budget-schemas";

describe("budget-schemas", () => {
  it("expose les seuils 50/75/90/100", () => {
    assert.deepEqual([...BUDGET_THRESHOLDS], [50, 75, 90, 100]);
  });

  it("monthToRange couvre le mois en fuseau applicatif", () => {
    const { start, end } = monthToRange("2026-09");
    assert.equal(start.toISOString(), "2026-08-31T21:00:00.000Z");
    assert.equal(end.toISOString(), "2026-09-30T21:00:00.000Z");
  });

  it("currentMonth dérive AAAA-MM", () => {
    assert.equal(currentMonth(new Date("2026-09-16T10:00:00Z")), "2026-09");
    assert.match(currentMonth(), /^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it("monthLabel libelle en français", () => {
    assert.equal(monthLabel("2026-09"), "septembre 2026");
  });
});
