import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  APP_TIME_ZONE,
  formatShortDate,
  todayInputValue,
  toInputDateValue,
} from "@/lib/dates";

describe("dates (fuseau Indian/Antananarivo)", () => {
  it("expose le fuseau applicatif", () => {
    assert.equal(APP_TIME_ZONE, "Indian/Antananarivo");
  });

  it("todayInputValue renvoie AAAA-MM-JJ dans le fuseau", () => {
    // 22h UTC = 01h le lendemain à Antananarivo (UTC+3).
    assert.equal(
      todayInputValue(new Date("2026-01-05T22:00:00Z")),
      "2026-01-06",
    );
    assert.match(todayInputValue(), /^\d{4}-\d{2}-\d{2}$/);
  });

  it("toInputDateValue convertit un ISO vers le champ date", () => {
    assert.equal(toInputDateValue("2026-09-14T08:00:00+03:00"), "2026-09-14");
  });

  it("formatShortDate formate en français court", () => {
    const out = formatShortDate("2026-09-16T08:00:00+03:00");
    assert.ok(out.includes("16") && out.includes("2026"), out);
  });

  it("formatShortDate accepte les Date et rejette l'invalide", () => {
    assert.ok(formatShortDate(new Date("2026-09-16T08:00:00+03:00")).includes("2026"));
    assert.equal(formatShortDate("pas-une-date"), "—");
  });
});
