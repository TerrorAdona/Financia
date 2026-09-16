import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  chatInputSchema,
  chatMessageSchema,
} from "@/lib/assistant-schemas";

describe("chatMessageSchema", () => {
  it("accepte un message valide (rôles stricts)", () => {
    assert.equal(
      chatMessageSchema.safeParse({ role: "user", content: "Bonjour" }).success,
      true,
    );
    assert.equal(
      chatMessageSchema.safeParse({ role: "system", content: "x" }).success,
      false,
    );
    assert.equal(
      chatMessageSchema.safeParse({ role: "user", content: "   " }).success,
      false,
    );
  });
});

describe("chatInputSchema", () => {
  it("accepte question + historique plafonné", () => {
    assert.equal(
      chatInputSchema.safeParse({ message: "Mon solde ?", history: [] }).success,
      true,
    );
    assert.equal(
      chatInputSchema.safeParse({ message: "", history: [] }).success,
      false,
    );
    assert.equal(
      chatInputSchema.safeParse({ message: "x".repeat(501), history: [] }).success,
      false,
    );
    const history = Array.from({ length: 11 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "msg",
    }));
    assert.equal(
      chatInputSchema.safeParse({ message: "x", history }).success,
      false,
    );
  });
});
