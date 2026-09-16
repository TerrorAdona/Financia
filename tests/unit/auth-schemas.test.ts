import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { loginSchema, registerSchema } from "@/lib/auth-schemas";

const validRegister = {
  firstName: "Aina",
  lastName: "Rakoto",
  email: "aina@exemple.mg",
  password: "Secret-42",
  confirmPassword: "Secret-42",
};

describe("registerSchema", () => {
  it("accepte une inscription valide (email normalisé)", () => {
    const res = registerSchema.safeParse({
      ...validRegister,
      email: "  AINA@Exemple.MG ",
    });
    assert.equal(res.success, true);
    if (res.success) assert.equal(res.data.email, "aina@exemple.mg");
  });

  it("refuse email invalide, mot de passe faible et confirmation différente", () => {
    assert.equal(
      registerSchema.safeParse({ ...validRegister, email: "pas-un-email" }).success,
      false,
    );
    assert.equal(
      registerSchema.safeParse({ ...validRegister, password: "court1", confirmPassword: "court1" }).success,
      false,
    );
    assert.equal(
      registerSchema.safeParse({ ...validRegister, password: "SansChiffre", confirmPassword: "SansChiffre" }).success,
      false,
    );
    assert.equal(
      registerSchema.safeParse({ ...validRegister, confirmPassword: "Autre-99" }).success,
      false,
    );
    assert.equal(
      registerSchema.safeParse({ ...validRegister, firstName: "X" }).success,
      false,
    );
  });
});

describe("loginSchema", () => {
  it("accepte un login valide", () => {
    assert.equal(
      loginSchema.safeParse({ email: "aina@exemple.mg", password: "x" }).success,
      true,
    );
  });

  it("refuse email invalide et mot de passe vide", () => {
    assert.equal(
      loginSchema.safeParse({ email: "zzz", password: "x" }).success,
      false,
    );
    assert.equal(
      loginSchema.safeParse({ email: "a@b.cd", password: "" }).success,
      false,
    );
  });
});
