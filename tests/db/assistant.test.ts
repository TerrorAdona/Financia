/**
 * Suite d'intégration de l'assistant IA (snapshot scopé + appel Groq stubbé).
 * Aucun appel réseau réel : le fetch est injecté en stub.
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { Prisma, PrismaClient } from "@prisma/client";

import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import {
  askAssistant,
  getFinanceSnapshot,
} from "@/lib/services/assistant";

const direct = new PrismaClient();
const MGA = (n: number | string) => new Prisma.Decimal(n);
const uid = () => Math.random().toString(36).slice(2, 10);

const userIds: string[] = [];
async function makeUser(tag: string): Promise<string> {
  const user = await direct.user.create({
    data: {
      email: `audit-${uid()}-${tag}@example.com`,
      firstName: "Audit",
      lastName: tag,
      name: `Audit ${tag}`,
      passwordHash: await hashPassword(`Pwd-${uid()}-42`),
    },
  });
  userIds.push(user.id);
  return user.id;
}

function stubFetch(reply: string, status = 200) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      choices: [{ message: { content: reply } }],
    }),
  });
}

before(async () => {
  try {
    await direct.$queryRaw`SELECT 1`;
  } catch {
    throw new Error(
      "Base de données inaccessible : définissez DATABASE_URL (voir .env.example).",
    );
  }
});

after(async () => {
  if (userIds.length > 0) {
    await direct.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await direct.$disconnect();
  await prisma.$disconnect();
});

describe("assistant : snapshot scopé par utilisateur", () => {
  it("ne contient que les données de l'utilisateur connecté", async () => {
    const a = await makeUser("asnap");
    const b = await makeUser("bsnap");
    const accA = await direct.account.create({
      data: { name: "Compte Alpha", type: "CASH", currency: "MGA", balance: MGA(700_000), userId: a },
    });
    const catA = await direct.category.create({
      data: { name: "Boulot Alpha", type: "INCOME", userId: a },
    });
    await direct.transaction.create({
      data: {
        amount: MGA(700_000),
        description: "Salaire Alpha",
        type: "INCOME",
        date: new Date(),
        userId: a,
        accountId: accA.id,
        categoryId: catA.id,
      },
    });
    const accB = await direct.account.create({
      data: { name: "Compte Beta", type: "BANK", currency: "MGA", balance: MGA(5_000), userId: b },
    });
    const catB = await direct.category.create({
      data: { name: "Boulot Beta", type: "INCOME", userId: b },
    });
    await direct.transaction.create({
      data: {
        amount: MGA(5_000),
        description: "Salaire Beta",
        type: "INCOME",
        date: new Date(),
        userId: b,
        accountId: accB.id,
        categoryId: catB.id,
      },
    });

    const snap = await getFinanceSnapshot(a);
    const json = JSON.stringify(snap);
    assert.ok(json.includes("Compte Alpha"));
    assert.ok(json.includes("Salaire Alpha"));
    assert.equal(snap.soldeTotal, 700_000);
    assert.ok(!json.includes("Beta"), "aucune donnée d'autrui");
    assert.ok(!json.includes("passwordHash"));
  });
});

describe("assistant : appel Groq (stubbé)", () => {
  it("retourne la réponse et transmet snapshot + historique", async () => {
    const a = await makeUser("aask");
    await direct.account.create({
      data: { name: "Caisse", type: "CASH", currency: "MGA", balance: MGA(42_000), userId: a },
    });

    let seenBody = "";
    const spy = async (url: string, init?: RequestInit) => {
      seenBody = typeof init?.body === "string" ? init.body : "";
      assert.ok(url.includes("api.groq.com"));
      assert.ok(
        (init?.headers as Record<string, string>)?.Authorization?.startsWith("Bearer "),
      );
      return stubFetch("Votre solde est de 42 000 Ar.")();
    };

    const res = await askAssistant(
      a,
      {
        message: "Quel est mon solde ?",
        history: [{ role: "user", content: "Bonjour" }],
      },
      { fetcher: spy, apiKey: "cle-test" },
    );
    assert.ok(!res.error, res.error);
    assert.equal(res.data!.reply, "Votre solde est de 42 000 Ar.");
    const body = JSON.parse(seenBody) as {
      model: string;
      messages: Array<{ role: string; content: string }>;
    };
    assert.ok(body.model.length > 0);
    assert.equal(body.messages[0].role, "system");
    assert.ok(body.messages[0].content.includes("Caisse"));
    assert.equal(body.messages.at(-1)?.content, "Quel est mon solde ?");
  });

  it("gère clé manquante, 401, 429 et panne réseau", async () => {
    const a = await makeUser("aerr");
    const prev = process.env.GROQ_API_KEY;
    delete process.env.GROQ_API_KEY;
    try {
      const missing = await askAssistant(a, { message: "x", history: [] });
      assert.ok(missing.error?.includes("GROQ_API_KEY"), missing.error);
    } finally {
      if (prev !== undefined) process.env.GROQ_API_KEY = prev;
    }

    const unauth = await askAssistant(
      a,
      { message: "x", history: [] },
      { fetcher: stubFetch("non", 401), apiKey: "k" },
    );
    assert.ok(unauth.error?.includes("invalide"), unauth.error);

    const saturated = await askAssistant(
      a,
      { message: "x", history: [] },
      { fetcher: stubFetch("non", 429), apiKey: "k" },
    );
    assert.ok(saturated.error?.includes("saturé"), saturated.error);

    const deadModel = await askAssistant(
      a,
      { message: "x", history: [] },
      {
        fetcher: async () => ({
          ok: false,
          status: 400,
          json: async () => ({ error: { code: "model_not_found" } }),
        }),
        apiKey: "k",
      },
    );
    assert.ok(deadModel.error?.includes("GROQ_MODEL"), deadModel.error);

    const down = await askAssistant(
      a,
      { message: "x", history: [] },
      {
        fetcher: async () => {
          throw new Error("boom");
        },
        apiKey: "k",
      },
    );
    assert.ok(down.error?.includes("indisponible"), down.error);
  });

  it("rejette les entrées invalides avant tout appel", async () => {
    const a = await makeUser("aval");
    let called = false;
    const res = await askAssistant(
      a,
      { message: "   ", history: [] },
      {
        fetcher: async () => {
          called = true;
          return {
            ok: true,
            status: 200,
            json: async () => ({ choices: [{ message: { content: "x" } }] }),
          };
        },
        apiKey: "k",
      },
    );
    assert.ok(res.error);
    assert.equal(called, false);
  });
});
