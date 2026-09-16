/**
 * Suite d'intégration (base de données réelle).
 * Exécutée via `npm test` (tsx --test). Chaque test utilise des emails
 * uniques et le nettoyage final supprime tous les utilisateurs créés
 * (les cascades Prisma effacent les données liées).
 */
import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";

import { Prisma, PrismaClient } from "@prisma/client";

import { authorizeCredentials } from "@/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { currentMonth, monthToRange } from "@/lib/budget-schemas";
import * as accountsSvc from "@/lib/services/accounts";
import * as budgetsSvc from "@/lib/services/budgets";
import * as goalsSvc from "@/lib/services/goals";
import * as notificationsSvc from "@/lib/services/notifications";
import * as settingsSvc from "@/lib/services/settings";
import * as transactionsSvc from "@/lib/services/transactions";
import * as transfersSvc from "@/lib/services/transfers";

const direct = new PrismaClient();
const MGA = (n: number | string) => new Prisma.Decimal(n);
const uid = () => Math.random().toString(36).slice(2, 10);
const num = (d: Prisma.Decimal) => Number(d.toFixed(2));

const userIds: string[] = [];
async function makeUser(
  tag: string,
  password?: string,
): Promise<{ id: string; email: string; password: string }> {
  const email = `audit-${uid()}-${tag}@example.com`;
  const pwd = password ?? `Pwd-${uid()}-42`;
  const user = await direct.user.create({
    data: {
      email,
      firstName: "Audit",
      lastName: tag,
      name: `Audit ${tag}`,
      passwordHash: password === null ? null : await hashPassword(pwd),
    },
  });
  userIds.push(user.id);
  return { id: user.id, email, password: pwd };
}

async function balances(ids: string[]): Promise<Record<string, number>> {
  const rows = await direct.account.findMany({
    where: { id: { in: ids } },
    select: { id: true, balance: true },
  });
  return Object.fromEntries(rows.map((r) => [r.id, num(r.balance)]));
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

describe("authentification (authorizeCredentials)", () => {
  it("accepte des identifiants valides, refuse sinon", async () => {
    const u = await makeUser("auth");
    const ok = await authorizeCredentials({ email: u.email, password: u.password });
    assert.ok(ok && ok.id === u.id && ok.email === u.email);
    assert.equal(await authorizeCredentials({ email: u.email, password: "Faux-99" }), null);
    assert.equal(
      await authorizeCredentials({ email: `inconnu-${uid()}@example.com`, password: "X-99" }),
      null,
    );
    assert.equal(await authorizeCredentials({ email: "pas-un-email", password: "X-99" }), null);
  });

  it("refuse les comptes sans mot de passe et ne l'expose jamais", async () => {
    const u = await makeUser("nohash", null as unknown as string);
    await direct.user.update({ where: { id: u.id }, data: { passwordHash: null } });
    assert.equal(
      await authorizeCredentials({ email: u.email, password: "X-99" }),
      null,
    );
    const row = await direct.user.findUniqueOrThrow({ where: { id: u.id } });
    assert.ok(row.passwordHash === null);
  });
});

describe("comptes", () => {
  it("CRUD + nom unique + isolation", async () => {
    const a = await makeUser("acctA");
    const b = await makeUser("acctB");
    const created = await accountsSvc.createAccount(a.id, {
      name: "Cash",
      type: "CASH",
      currency: "MGA",
      balance: 1000,
    });
    assert.ok(!created.error && created.data, created.error);
    assert.equal(
      (await accountsSvc.createAccount(a.id, { name: "Cash", type: "BANK", currency: "MGA", balance: 0 })).error?.includes("déjà"),
      true,
    );
    // Même nom autorisé pour un autre utilisateur.
    const other = await accountsSvc.createAccount(b.id, {
      name: "Cash",
      type: "CASH",
      currency: "MGA",
      balance: 0,
    });
    assert.ok(!other.error, other.error);
    // Modification du compte d'autrui refusée.
    assert.ok(
      (await accountsSvc.updateAccount(b.id, { id: created.data!.id, name: "X", type: "CASH", currency: "MGA", balance: 0 })).error,
    );
    // Suppression du compte d'autrui refusée.
    assert.ok((await accountsSvc.deleteAccount(b.id, created.data!.id)).error);
    assert.ok((await accountsSvc.deleteAccount(a.id, other.data!.id)).error);
  });

  it("suppression bloquée avec transactions ou demandes liées", async () => {
    const a = await makeUser("acctDelA");
    const b = await makeUser("acctDelB");
    const cash = await accountsSvc.createAccount(a.id, { name: "Cash", type: "CASH", currency: "MGA", balance: 500_000 });
    const dest = await accountsSvc.createAccount(b.id, { name: "Cash", type: "CASH", currency: "MGA", balance: 0 });
    const req = await transfersSvc.requestTransfer(a.id, {
      fromAccountId: cash.data!.id,
      toAccountId: dest.data!.id,
      amount: 10_000,
    });
    assert.ok(!req.error, req.error);
    // Compte source : suppression refusée (demande liée).
    const delSrc = await accountsSvc.deleteAccount(a.id, cash.data!.id);
    assert.ok(delSrc.error?.includes("transfert"), delSrc.error ?? "supprimé !");
    // Compte destinataire (autre utilisateur) : refusé aussi.
    const delDst = await accountsSvc.deleteAccount(b.id, dest.data!.id);
    assert.ok(delDst.error?.includes("transfert"), delDst.error ?? "supprimé !");
    // L'historique de B est intact.
    assert.equal((await transfersSvc.listTransferRequests(b.id)).data!.pendingReceived.length, 1);
    // Compte sans lien : suppression ok.
    const free = await accountsSvc.createAccount(a.id, { name: "Libre", type: "CASH", currency: "MGA", balance: 0 });
    assert.ok(!(await accountsSvc.deleteAccount(a.id, free.data!.id)).error);
  });
});

describe("transactions et transferts instantanés", () => {
  it("soldes, gardes et restauration", async () => {
    const u = await makeUser("tx");
    const v = await makeUser("txOther");
    const src = await direct.account.create({ data: { name: "Src", type: "CASH", currency: "MGA", balance: MGA(1_000_000), userId: u.id } });
    const dst = await direct.account.create({ data: { name: "Dst", type: "BANK", currency: "MGA", balance: MGA(0), userId: u.id } });
    const foreign = await direct.account.create({ data: { name: "F", type: "CASH", currency: "MGA", balance: MGA(0), userId: v.id } });
    const cat = await direct.category.create({ data: { name: "Cat", type: "EXPENSE", userId: u.id } });

    const t = await transfersSvc.createTransfer(u.id, {
      fromAccountId: src.id,
      toAccountId: dst.id,
      amount: 500_000,
    });
    assert.ok(!t.error && t.data?.type === "TRANSFER", t.error);
    let b = await balances([src.id, dst.id]);
    assert.deepEqual(b, { [src.id]: 500_000, [dst.id]: 500_000 });

    // Gardes.
    assert.ok((await transfersSvc.createTransfer(u.id, { fromAccountId: src.id, toAccountId: dst.id, amount: 600_000 })).error);
    assert.ok((await transfersSvc.createTransfer(u.id, { fromAccountId: src.id, toAccountId: src.id, amount: 10 })).error);
    assert.ok((await transfersSvc.createTransfer(u.id, { fromAccountId: src.id, toAccountId: foreign.id, amount: 10 })).error);
    assert.ok((await transfersSvc.createTransfer(u.id, { fromAccountId: foreign.id, toAccountId: dst.id, amount: 10 })).error);

    // Suppression d'un transfert restaure les deux soldes.
    assert.ok(!(await transactionsSvc.deleteTransaction(u.id, t.data!.id)).error);
    b = await balances([src.id, dst.id]);
    assert.deepEqual(b, { [src.id]: 1_000_000, [dst.id]: 0 });

    // Dépense ordinaire incluse dans les budgets, transfert exclu (voir suite budgets).
    const exp = await transactionsSvc.createTransaction(u.id, {
      description: "Dépense",
      amount: 100_000,
      type: "EXPENSE",
      accountId: src.id,
      categoryId: cat.id,
      date: new Date(),
      note: null,
    });
    assert.ok(!exp.error, exp.error);
    b = await balances([src.id]);
    assert.equal(b[src.id], 900_000);
  });
});

describe("budgets et alertes", () => {
  it("seuils 50/75/90/100 idempotents", async () => {
    const u = await makeUser("bud");
    const acc = await direct.account.create({ data: { name: "C", type: "CASH", currency: "MGA", balance: MGA(5_000_000), userId: u.id } });
    const cat = await direct.category.create({ data: { name: "Alim", type: "EXPENSE", userId: u.id } });
    const month = currentMonth();
    const { start, end } = monthToRange(month);
    const created = await budgetsSvc.createBudget(u.id, {
      name: "Budget",
      categoryId: cat.id,
      month,
      amountLimit: 1_000_000,
    });
    assert.ok(!created.error, created.error);
    void start;
    void end;

    const spend = (n: number) =>
      direct.transaction.create({
        data: { amount: MGA(n), description: "x", type: "EXPENSE", date: new Date(), userId: u.id, accountId: acc.id, categoryId: cat.id },
      });
    const titles = async () =>
      (await direct.notification.findMany({ where: { userId: u.id }, select: { title: true } })).map((n) => n.title);

    await spend(600_000);
    await budgetsSvc.refreshBudgetAlerts(u.id);
    assert.ok((await titles()).some((t) => t.includes("50 %")));
    await spend(200_000);
    await budgetsSvc.refreshBudgetAlerts(u.id);
    assert.ok((await titles()).some((t) => t.includes("75 %")));
    await spend(150_000);
    await budgetsSvc.refreshBudgetAlerts(u.id);
    assert.ok((await titles()).some((t) => t.includes("90 %")));
    await spend(100_000);
    await budgetsSvc.refreshBudgetAlerts(u.id);
    assert.ok((await titles()).some((t) => t.includes("dépassé")));
    const n = (await titles()).length;
    await budgetsSvc.refreshBudgetAlerts(u.id);
    assert.equal((await titles()).length, n);
  });
});

describe("objectifs", () => {
  it("contributions, proche et atteint", async () => {
    const u = await makeUser("goal");
    const future = new Date(Date.now() + 30 * 86_400_000);
    const g = await goalsSvc.createGoal(u.id, {
      name: "Moto",
      description: "",
      targetAmount: 1_000_000,
      currentAmount: 100_000,
      deadline: future,
    });
    assert.ok(!g.error && g.data, g.error);
    const c1 = await goalsSvc.contributeToGoal(u.id, { id: g.data!.id, amount: 750_000 });
    assert.ok(!c1.error, c1.error);
    let titles = (await direct.notification.findMany({ where: { userId: u.id }, select: { title: true } })).map((n) => n.title);
    assert.ok(titles.some((t) => t.includes("proche")));
    const c2 = await goalsSvc.contributeToGoal(u.id, { id: g.data!.id, amount: 200_000 });
    assert.ok(!c2.error, c2.error);
    titles = (await direct.notification.findMany({ where: { userId: u.id }, select: { title: true } })).map((n) => n.title);
    assert.ok(titles.some((t) => t.includes("atteint")));
    // Contribution d'autrui refusée.
    const v = await makeUser("goalOther");
    assert.ok((await goalsSvc.contributeToGoal(v.id, { id: g.data!.id, amount: 10 })).error);
  });
});

describe("notifications", () => {
  it("CRUD, compteurs et isolation", async () => {
    const a = await makeUser("notA");
    const b = await makeUser("notB");
    await direct.notification.createMany({
      data: [
        { title: "N1", message: "m", type: "INFO", userId: a.id },
        { title: "N2", message: "m", type: "INFO", userId: a.id },
      ],
    });
    assert.equal(await notificationsSvc.getUnreadCount(a.id), 2);
    const list = await notificationsSvc.listNotifications(a.id);
    assert.equal(list.data!.notifications.length, 2);
    const first = list.data!.notifications[0];
    assert.ok((await notificationsSvc.markNotificationAsRead(a.id, first.id)).data!.isRead);
    assert.equal(await notificationsSvc.getUnreadCount(a.id), 1);
    assert.equal((await notificationsSvc.markAllNotificationsAsRead(a.id)).data!.count, 1);
    assert.equal(await notificationsSvc.getUnreadCount(a.id), 0);
    assert.ok(!(await notificationsSvc.deleteNotification(a.id, first.id)).error);
    assert.equal((await notificationsSvc.listNotifications(a.id)).data!.notifications.length, 1);
    // Isolation stricte.
    assert.equal((await notificationsSvc.listNotifications(b.id)).data!.notifications.length, 0);
    const victim = (await notificationsSvc.listNotifications(a.id)).data!.notifications[0];
    assert.ok((await notificationsSvc.markNotificationAsRead(b.id, victim.id)).error);
    assert.ok((await notificationsSvc.deleteNotification(b.id, victim.id)).error);
  });
});

describe("transferts inter-utilisateurs", () => {
  it("demande -> notification -> acceptation atomique", async () => {
    const a = await makeUser("snd");
    const b = await makeUser("rcv");
    const c = await makeUser("tier");
    const src = await direct.account.create({ data: { name: "S", type: "CASH", currency: "MGA", balance: MGA(1_000_000), userId: a.id } });
    const dst = await direct.account.create({ data: { name: "D", type: "BANK", currency: "MGA", balance: MGA(0), userId: b.id } });

    const req = await transfersSvc.requestTransfer(a.id, {
      fromAccountId: src.id,
      toAccountId: dst.id,
      amount: 400_000,
    });
    assert.ok(!req.error && req.data!.status === "PENDING", req.error);
    assert.equal(req.data!.transactionId, null);
    let bal = await balances([src.id, dst.id]);
    assert.deepEqual(bal, { [src.id]: 1_000_000, [dst.id]: 0 });
    assert.ok(
      (await direct.notification.findMany({ where: { userId: b.id }, select: { title: true } }))
        .some((n) => n.title.startsWith("Transfert reçu")),
    );

    // Tiers et expéditeur ne peuvent pas confirmer.
    assert.ok((await transfersSvc.acceptTransferRequest(c.id, { id: req.data!.id })).error);
    assert.ok((await transfersSvc.acceptTransferRequest(a.id, { id: req.data!.id })).error);

    const acc = await transfersSvc.acceptTransferRequest(b.id, { id: req.data!.id });
    assert.ok(!acc.error && acc.data!.status === "COMPLETED", acc.error);
    bal = await balances([src.id, dst.id]);
    assert.deepEqual(bal, { [src.id]: 600_000, [dst.id]: 400_000 });
    assert.ok(acc.data!.transactionId);
    assert.ok((await transfersSvc.acceptTransferRequest(b.id, { id: req.data!.id })).error);

    // Refus : aucun mouvement.
    const req2 = await transfersSvc.requestTransfer(a.id, { fromAccountId: src.id, toAccountId: dst.id, amount: 10_000 });
    assert.ok(!req2.error, req2.error);
    const rej = await transfersSvc.rejectTransferRequest(b.id, { id: req2.data!.id });
    assert.ok(!rej.error && rej.data!.status === "REJECTED", rej.error);
    bal = await balances([src.id, dst.id]);
    assert.deepEqual(bal, { [src.id]: 600_000, [dst.id]: 400_000 });

    // Annulation par l'expéditeur, puis accept impossible.
    const req3 = await transfersSvc.requestTransfer(a.id, { fromAccountId: src.id, toAccountId: dst.id, amount: 10_000 });
    assert.ok(!(await transfersSvc.cancelTransferRequest(a.id, { id: req3.data!.id })).error);
    assert.ok((await transfersSvc.acceptTransferRequest(b.id, { id: req3.data!.id })).error);

    // Isolation des listes.
    const lc = await transfersSvc.listTransferRequests(c.id);
    assert.deepEqual(
      [lc.data!.pendingReceived.length, lc.data!.pendingSent.length, lc.data!.history.length],
      [0, 0, 0],
    );
  });
});

describe("paramètres et sécurité", () => {
  it("profil, préférences, mot de passe", async () => {
    const u = await makeUser("set");
    const got = await settingsSvc.getSettings(u.id);
    assert.ok(!got.error && got.data, got.error);
    const up = await settingsSvc.updateProfile(u.id, {
      firstName: "Nadia",
      lastName: "Test",
      email: u.email,
      image: null,
    });
    assert.ok(!up.error && up.data!.firstName === "Nadia", up.error);
    const prefs = await settingsSvc.updatePreferences(u.id, {
      preferredCurrency: "EUR",
      locale: "en",
      dateFormat: "yyyy-MM-dd",
    });
    assert.ok(!prefs.error, prefs.error);
    assert.ok((await settingsSvc.updatePreferences(u.id, { preferredCurrency: "CHF" as "MGA", locale: "fr", dateFormat: "dd/MM/yyyy" })).error);
    assert.ok((await settingsSvc.changePassword(u.id, { currentPassword: "faux", newPassword: "Nouveau-99", confirmPassword: "Nouveau-99" })).error);
    const np = `New-${uid()}-77`;
    assert.ok(!(await settingsSvc.changePassword(u.id, { currentPassword: u.password, newPassword: np, confirmPassword: np })).error);
  });

  it("suppression avec confirmation forte et cascade complète", async () => {
    const d = await makeUser("doomed");
    const acc = await direct.account.create({ data: { name: "C", type: "CASH", currency: "MGA", balance: MGA(10_000), userId: d.id } });
    const cat = await direct.category.create({ data: { name: "C", type: "EXPENSE", userId: d.id } });
    await direct.transaction.create({ data: { amount: MGA(100), description: "x", type: "EXPENSE", date: new Date(), userId: d.id, accountId: acc.id, categoryId: cat.id } });
    await direct.notification.create({ data: { title: "x", message: "x", type: "INFO", userId: d.id } });
    await direct.savingsGoal.create({ data: { name: "G", targetAmount: MGA(1000), currentAmount: MGA(0), status: "ACTIVE", userId: d.id } });

    assert.ok((await settingsSvc.deleteAccount(d.id, { email: "autre@example.com", password: d.password })).error);
    assert.ok((await settingsSvc.deleteAccount(d.id, { email: d.email, password: "faux" })).error);
    assert.ok(await direct.user.findUnique({ where: { id: d.id } }));
    assert.ok(!(await settingsSvc.deleteAccount(d.id, { email: d.email, password: d.password })).error);
    const rest = await Promise.all([
      direct.account.count({ where: { userId: d.id } }),
      direct.transaction.count({ where: { userId: d.id } }),
      direct.category.count({ where: { userId: d.id } }),
      direct.savingsGoal.count({ where: { userId: d.id } }),
      direct.notification.count({ where: { userId: d.id } }),
      direct.transferRequest.count({ where: { OR: [{ senderId: d.id }, { recipientId: d.id }] } }),
    ]);
    assert.deepEqual(rest, [0, 0, 0, 0, 0, 0]);
  });
});
