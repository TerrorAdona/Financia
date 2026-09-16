import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  changePasswordSchema,
  deleteAccountSchema,
  updatePreferencesSchema,
  updateProfileSchema,
} from "@/lib/settings-schemas";

describe("updateProfileSchema", () => {
  it("accepte un profil valide (avatar optionnel)", () => {
    const base = {
      firstName: "Aina",
      lastName: "Rakoto",
      email: "aina@exemple.mg",
    };
    assert.equal(
      updateProfileSchema.safeParse({ ...base, image: null }).success,
      true,
    );
    assert.equal(
      updateProfileSchema.safeParse({
        ...base,
        image: "https://example.com/a.png",
      }).success,
      true,
    );
    assert.equal(updateProfileSchema.safeParse({ ...base, image: "" }).success, true);
  });

  it("refuse email, nom et avatar invalides", () => {
    const base = { firstName: "Aina", lastName: "Rakoto", email: "aina@exemple.mg" };
    assert.equal(
      updateProfileSchema.safeParse({ ...base, email: "zzz" }).success,
      false,
    );
    assert.equal(
      updateProfileSchema.safeParse({ ...base, firstName: "X" }).success,
      false,
    );
    assert.equal(
      updateProfileSchema.safeParse({ ...base, image: "ftp://x" }).success,
      false,
    );
  });
});

describe("updatePreferencesSchema", () => {
  it("accepte des préférences valides et refuse l'inconnu", () => {
    assert.equal(
      updatePreferencesSchema.safeParse({
        preferredCurrency: "EUR",
        locale: "en",
        dateFormat: "yyyy-MM-dd",
      }).success,
      true,
    );
    assert.equal(
      updatePreferencesSchema.safeParse({
        preferredCurrency: "CHF",
        locale: "fr",
        dateFormat: "dd/MM/yyyy",
      }).success,
      false,
    );
    assert.equal(
      updatePreferencesSchema.safeParse({
        preferredCurrency: "MGA",
        locale: "de",
        dateFormat: "dd/MM/yyyy",
      }).success,
      false,
    );
    assert.equal(
      updatePreferencesSchema.safeParse({
        preferredCurrency: "MGA",
        locale: "fr",
        dateFormat: "JJ.MM.AAAA",
      }).success,
      false,
    );
  });
});

describe("changePasswordSchema / deleteAccountSchema", () => {
  it("impose confirmation et différence avec l'actuel", () => {
    assert.equal(
      changePasswordSchema.safeParse({
        currentPassword: "Ancien-1",
        newPassword: "Nouveau-99",
        confirmPassword: "Nouveau-99",
      }).success,
      true,
    );
    assert.equal(
      changePasswordSchema.safeParse({
        currentPassword: "Ancien-1",
        newPassword: "Nouveau-99",
        confirmPassword: "Autre-99",
      }).success,
      false,
    );
    assert.equal(
      changePasswordSchema.safeParse({
        currentPassword: "Secret-42",
        newPassword: "Secret-42",
        confirmPassword: "Secret-42",
      }).success,
      false,
    );
    assert.equal(
      changePasswordSchema.safeParse({
        currentPassword: "Ancien-1",
        newPassword: "court1",
        confirmPassword: "court1",
      }).success,
      false,
    );
  });

  it("valide les champs de confirmation forte", () => {
    assert.equal(
      deleteAccountSchema.safeParse({ email: "a@b.cd", password: "x" }).success,
      true,
    );
    assert.equal(
      deleteAccountSchema.safeParse({ email: "zzz", password: "x" }).success,
      false,
    );
    assert.equal(
      deleteAccountSchema.safeParse({ email: "a@b.cd", password: "" }).success,
      false,
    );
  });
});
