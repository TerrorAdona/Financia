# Financia — Gestion financière personnelle

Application web de finances personnelles (Ariary par défaut) : comptes,
transactions, budgets avec alertes, objectifs d'épargne, transferts entre
utilisateurs avec confirmation, notifications, analyses et paramètres.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack), **React 19**
- **PostgreSQL** + **Prisma 6**, **Auth.js v5** (Credentials, JWT)
- **Tailwind CSS 4**, **shadcn/base-ui**, **Recharts**, **Zod**, **bcryptjs**
- Tests : runner natif Node (`node:test`) via `tsx --test`

## Prérequis

- Node.js 20+ · PostgreSQL 15+

## Démarrage local

```bash
npm install
Copy-Item .env.example .env   # puis renseignez DATABASE_URL, AUTH_SECRET, AUTH_URL
npx prisma migrate deploy     # ou : npm run db:migrate (dev)
npm run db:seed               # jeu de démonstration (optionnel)
npm run dev                   # http://localhost:3000
```

Comptes démo (seed local uniquement) : `demo@financia.mg` et
`bema@financia.mg`, mot de passe `Demo-2026`.

## Scripts

| Script            | Usage                                              |
| ----------------- | -------------------------------------------------- |
| `npm run dev`     | Serveur de développement                           |
| `npm run build` / `npm run start` | Build puis serveur de production      |
| `npm run lint`    | ESLint                                             |
| `npm run typecheck` | `tsc --noEmit`                                   |
| `npm test`        | Suite complète (unitaires + intégration, DB requise) |
| `npm run test:unit` / `npm run test:db` | Sous-ensembles                |
| `npm run db:migrate` | `prisma migrate dev` (développement)            |
| `npm run db:deploy` | `prisma migrate deploy` (production)             |
| `npm run db:status` | État des migrations                              |
| `npm run db:seed` | Données de démonstration (idempotent, local)       |

## Fonctionnalités

- **Dashboard** : soldes, revenus/dépenses du mois, évolution, top catégories
- **Transactions** : revenus, dépenses, transferts instantanés (atomicité Prisma)
- **Transferts** : demandes inter-utilisateurs (recherche nom/email) avec **confirmation du destinataire** avant tout mouvement ; statuts PENDING/COMPLETED/REJECTED/CANCELLED
- **Budgets** : plafonds mensuels, alertes 50/75/90/100 % (anti-doublons)
- **Objectifs** : épargne, contributions, notifications « proche » (80 %) et « atteint »
- **Notifications** : centre complet, marquage lu/non lu, compteur temps réel
- **Paramètres** (`/settings`) : profil + avatar, devise/langue/format de date, thème clair/sombre/système, mot de passe, suppression de compte (confirmation forte, cascade Prisma)

Règles métier clés : un transfert n'est ni un revenu ni une dépense ;
solde insuffisant, devises différentes et comptes archivés bloquent tout
transfert ; chaque utilisateur ne voit que ses propres données
(`where: { userId }` systématique, validation Zod côté serveur).

## Structure

```
prisma/            schéma, migrations, seed
src/app/(app)/     pages protégées (dashboard, transactions, transfers, …)
src/app/actions/   Server Actions (authentification requise via requireUserId)
src/lib/services/  logique métier + accès Prisma (scopés par utilisateur)
src/lib/*-schemas.ts  validation Zod
src/components/    UI (par domaine + shadcn)
tests/unit|db/     tests node:test (lancés avec tsx)
```

## Déploiement

```bash
npm ci
npx prisma migrate deploy
npm run build
npm run start
```

Variables requises : `DATABASE_URL`, `AUTH_SECRET` (aléatoire, 32+ caractères),
`AUTH_URL` (URL publique). Derrière un proxy : `AUTH_TRUST_HOST="true"`.
Ne commitez jamais `.env` (voir `.env.example`).
