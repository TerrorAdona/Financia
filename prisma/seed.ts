import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const MGA = (n: number | string) => new Prisma.Decimal(n);

const DEMO_EMAIL = "demo@financia.mg";
const DEMO_PASSWORD = "Demo-2026";
const DEMO2_EMAIL = "bema@financia.mg";
const DEMO2_PASSWORD = "Demo-2026";

/**
 * Jeu de démonstration Financia — montants réalistes en Ariary (MGA).
 * Idempotent : purge les données des utilisateurs démo avant recréation.
 * Développement local uniquement (mots de passe documentés ci-dessus).
 */
async function main() {
  // Purge ciblée (ordre respectant les clés étrangères)
  for (const email of [DEMO_EMAIL, DEMO2_EMAIL]) {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (!existing) continue;
    const userId = existing.id;
    await prisma.transferRequest.deleteMany({
      where: { OR: [{ senderId: userId }, { recipientId: userId }] },
    });
    await prisma.notification.deleteMany({ where: { userId } });
    await prisma.transaction.deleteMany({ where: { userId } });
    await prisma.budget.deleteMany({ where: { userId } });
    await prisma.savingsGoal.deleteMany({ where: { userId } });
    await prisma.category.deleteMany({ where: { userId } });
    await prisma.account.deleteMany({ where: { userId } });
    await prisma.user.delete({ where: { id: userId } });
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 4);
  const user = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      firstName: "Aina",
      lastName: "Rakoto",
      name: "Aina Rakoto",
      passwordHash,
    },
  });

  // --- Comptes ---
  const [cash, mvola, bni] = await Promise.all(
    [
      { name: "Espèces", type: "CASH" as const, balance: MGA(500_000) },
      { name: "MVola", type: "MOBILE_MONEY" as const, balance: MGA(1_200_000) },
      {
        name: "BNI Madagasikara",
        type: "BANK" as const,
        balance: MGA(3_500_000),
      },
    ].map((a) =>
      prisma.account.create({
        data: {
          name: a.name,
          type: a.type,
          currency: "MGA",
          balance: a.balance,
          userId: user.id,
        },
      }),
    ),
  );

  // --- Catégories ---
  const categoryDefs = [
    { name: "Alimentation", icon: "ShoppingCart", color: "#22c55e", type: "EXPENSE" as const },
    { name: "Transport", icon: "Car", color: "#3b82f6", type: "EXPENSE" as const },
    { name: "Logement", icon: "Home", color: "#a855f7", type: "EXPENSE" as const },
    { name: "Santé", icon: "HeartPulse", color: "#ef4444", type: "EXPENSE" as const },
    { name: "Factures", icon: "Receipt", color: "#f59e0b", type: "EXPENSE" as const },
    { name: "Loisirs", icon: "Clapperboard", color: "#ec4899", type: "EXPENSE" as const },
    { name: "Salaire", icon: "Briefcase", color: "#10b981", type: "INCOME" as const },
    { name: "Freelance", icon: "Laptop", color: "#0ea5e9", type: "INCOME" as const },
  ];
  const categories = await Promise.all(
    categoryDefs.map((c) =>
      prisma.category.create({ data: { ...c, userId: user.id } }),
    ),
  );
  const cat = Object.fromEntries(categories.map((c) => [c.name, c]));

  // --- Transactions (sept. 2026, Antananarivo UTC+3) ---
  const T = (
    d: string,
  ): Date => new Date(`${d}T08:00:00+03:00`);

  await prisma.transaction.createMany({
    data: [
      {
        amount: MGA(2_500_000),
        description: "Salaire août — Entreprise Ando",
        type: "INCOME",
        date: T("2026-08-28"),
        note: "Virement mensuel",
        userId: user.id,
        accountId: bni.id,
        categoryId: cat["Salaire"].id,
      },
      {
        amount: MGA(450_000),
        description: "Loyer septembre — Ankorondrano",
        type: "EXPENSE",
        date: T("2026-09-01"),
        userId: user.id,
        accountId: bni.id,
        categoryId: cat["Logement"].id,
      },
      {
        amount: MGA(800_000),
        description: "Mission freelance — site vitrine",
        type: "INCOME",
        date: T("2026-09-02"),
        note: "Acompte 50 % reçu via MVola",
        userId: user.id,
        accountId: mvola.id,
        categoryId: cat["Freelance"].id,
      },
      {
        amount: MGA(85_000),
        description: "Marché d'Analakely",
        type: "EXPENSE",
        date: T("2026-09-03"),
        note: "Légumes, riz et fruits de la semaine",
        userId: user.id,
        accountId: cash.id,
        categoryId: cat["Alimentation"].id,
      },
      {
        amount: MGA(75_000),
        description: "Facture Jirama",
        type: "EXPENSE",
        date: T("2026-09-04"),
        userId: user.id,
        accountId: mvola.id,
        categoryId: cat["Factures"].id,
      },
      {
        amount: MGA(200_000),
        description: "Alimentation MVola → espèces",
        type: "TRANSFER",
        date: T("2026-09-05"),
        note: "Retrait pour les courses",
        userId: user.id,
        accountId: mvola.id,
        toAccountId: cash.id,
      },
      {
        amount: MGA(150_000),
        description: "Courses Shoprite",
        type: "EXPENSE",
        date: T("2026-09-06"),
        userId: user.id,
        accountId: cash.id,
        categoryId: cat["Alimentation"].id,
      },
      {
        amount: MGA(30_000),
        description: "Taxi-be et déplacements",
        type: "EXPENSE",
        date: T("2026-09-07"),
        userId: user.id,
        accountId: cash.id,
        categoryId: cat["Transport"].id,
      },
      {
        amount: MGA(350_000),
        description: "Logo pour épicerie Tana",
        type: "INCOME",
        date: T("2026-09-08"),
        userId: user.id,
        accountId: mvola.id,
        categoryId: cat["Freelance"].id,
      },
      {
        amount: MGA(60_000),
        description: "Pharmacie — ordonnance",
        type: "EXPENSE",
        date: T("2026-09-09"),
        userId: user.id,
        accountId: cash.id,
        categoryId: cat["Santé"].id,
      },
      {
        amount: MGA(120_000),
        description: "Dîner en famille",
        type: "EXPENSE",
        date: T("2026-09-10"),
        userId: user.id,
        accountId: mvola.id,
        categoryId: cat["Loisirs"].id,
      },
    ],
  });

  // --- Budgets (septembre 2026) ---
  await prisma.budget.createMany({
    data: [
      {
        name: "Alimentation — septembre",
        amountLimit: MGA(600_000),
        period: "MONTHLY",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-30"),
        userId: user.id,
        categoryId: cat["Alimentation"].id,
      },
      {
        name: "Transport — septembre",
        amountLimit: MGA(200_000),
        period: "MONTHLY",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-30"),
        userId: user.id,
        categoryId: cat["Transport"].id,
      },
      {
        name: "Loisirs — septembre",
        amountLimit: MGA(150_000),
        period: "MONTHLY",
        startDate: new Date("2026-09-01"),
        endDate: new Date("2026-09-30"),
        userId: user.id,
        categoryId: cat["Loisirs"].id,
      },
    ],
  });

  // --- Objectifs d'épargne ---
  await prisma.savingsGoal.createMany({
    data: [
      {
        name: "Fonds d'urgence",
        targetAmount: MGA(5_000_000),
        currentAmount: MGA(1_200_000),
        status: "ACTIVE",
        userId: user.id,
      },
      {
        name: "Moto Honda",
        targetAmount: MGA(8_500_000),
        currentAmount: MGA(2_000_000),
        deadline: new Date("2027-06-30"),
        status: "ACTIVE",
        userId: user.id,
      },
    ],
  });

  // --- Notifications ---
  await prisma.notification.createMany({
    data: [
      {
        title: "Bienvenue sur Financia",
        message:
          "Votre espace démo est prêt avec 3 comptes, 8 catégories et 11 transactions en Ariary.",
        type: "INFO",
        userId: user.id,
      },
      {
        title: "Budget Alimentation à 39 %",
        message:
          "235 000 Ar dépensés sur 600 000 Ar prévus pour septembre.",
        type: "BUDGET_ALERT",
        userId: user.id,
      },
      {
        title: "Fonds d'urgence : 24 % atteint",
        message:
          "1 200 000 Ar épargnés sur un objectif de 5 000 000 Ar. Continuez ainsi !",
        type: "GOAL_UPDATE",
        userId: user.id,
      },
    ],
  });

  // --- Second utilisateur démo + demande de transfert en attente ---
  // Permet de tester le flux inter-utilisateurs depuis les deux comptes
  // (recherche « bema », page /transfers, notification « Transfert reçu »).
  const user2 = await prisma.user.create({
    data: {
      email: DEMO2_EMAIL,
      firstName: "Bema",
      lastName: "Hasina",
      name: "Bema Hasina",
      passwordHash,
    },
  });
  const bemaCash = await prisma.account.create({
    data: {
      name: "Espèces Bema",
      type: "CASH",
      currency: "MGA",
      balance: MGA(300_000),
      userId: user2.id,
    },
  });
  await prisma.transferRequest.create({
    data: {
      amount: MGA(100_000),
      description: "Remboursement déjeuner",
      status: "PENDING",
      senderId: user2.id,
      recipientId: user.id,
      fromAccountId: bemaCash.id,
      toAccountId: mvola.id,
    },
  });
  await prisma.notification.create({
    data: {
      title: "Transfert reçu de Bema Hasina",
      message:
        "Bema Hasina vous propose un transfert de 100 000 Ar vers votre compte « MVola ». Acceptez ou refusez depuis la page Transferts.",
      type: "INFO",
      userId: user.id,
    },
  });

  console.log(`Seed OK — démo 1 : ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`Seed OK — démo 2 : ${DEMO2_EMAIL} / ${DEMO2_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error("Seed FAILED :", e);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
