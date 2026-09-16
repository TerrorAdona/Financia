import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { getNotificationKind } from "@/components/notifications/notification-kind";
import type { NotificationDTO } from "@/lib/services/notifications";

function stub(title: string, type: NotificationDTO["type"]): NotificationDTO {
  return {
    id: "c0123456789012345678901234",
    title,
    message: "message",
    type,
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
}

describe("getNotificationKind", () => {
  const cases: Array<[string, NotificationDTO["type"], string, boolean]> = [
    ["Budget « Alim » : seuil 50 % atteint", "BUDGET_ALERT", "budget-50", false],
    ["Budget « Alim » : seuil 75 % atteint", "BUDGET_ALERT", "budget-75", false],
    ["Budget « Alim » : seuil 90 % atteint", "BUDGET_ALERT", "budget-90", false],
    ["Budget « Alim » dépassé", "BUDGET_ALERT", "budget-exceeded", false],
    ["Objectif « Moto » proche du but", "GOAL_UPDATE", "goal-near", false],
    ["Objectif « Moto » atteint !", "GOAL_UPDATE", "goal-reached", false],
    ["Transaction importante : Salaire", "INFO", "large-transaction", false],
    ["Transfert reçu de Alice", "INFO", "transfer-received", true],
    ["Transfert accepté par Bob", "INFO", "transfer-accepted", true],
    ["Transfert refusé par Bob", "INFO", "transfer-declined", true],
    ["Transfert annulé par Alice", "INFO", "transfer-declined", true],
    ["Rappel quelconque", "REMINDER", "reminder", false],
    ["Bienvenue sur Financia", "INFO", "info", false],
  ];

  for (const [title, type, key, linked] of cases) {
    it(`« ${title} » -> ${key}`, () => {
      const kind = getNotificationKind(stub(title, type));
      assert.equal(kind.key, key);
      assert.equal(kind.href, linked ? "/transfers" : undefined);
    });
  }
});
