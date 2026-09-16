import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { hashPassword, verifyPassword } from "@/lib/password";

describe("password (bcrypt)", () => {
  it("vérifie le mot de passe haché", async () => {
    const hash = await hashPassword("Secret-42");
    assert.equal(await verifyPassword("Secret-42", hash), true);
    assert.equal(await verifyPassword("Faux-42", hash), false);
  });

  it("sale chaque hachage", async () => {
    const a = await hashPassword("Secret-42");
    const b = await hashPassword("Secret-42");
    assert.notEqual(a, b);
  });
});
