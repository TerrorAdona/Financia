import { currentMonth } from "@/lib/budget-schemas";
import { firstIssue } from "@/lib/validation";
import {
  chatInputSchema,
  type ChatInput,
  type ChatMessage,
} from "@/lib/assistant-schemas";
import { listAccounts } from "@/lib/services/accounts";
import { listBudgets } from "@/lib/services/budgets";
import { listGoals } from "@/lib/services/goals";
import { getUnreadCount } from "@/lib/services/notifications";
import { listTransactions } from "@/lib/services/transactions";

export type AssistantResult<T = undefined> = {
  data?: T;
  error?: string;
};

/** Modèle par défaut (surchargé par GROQ_MODEL). */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

/** Résumé financier transmis au modèle (données de l'utilisateur UNIQUEMENT). */
export type FinanceSnapshot = {
  devise: string;
  soldeTotal: number;
  comptes: Array<{ nom: string; type: string; solde: number }>;
  transactionsRecentes: Array<{
    date: string;
    description: string;
    montant: number;
    type: string;
    compte: string;
    categorie: string | null;
  }>;
  budgetsMois: Array<{
    nom: string;
    plafond: number;
    depense: number;
    pourcentage: number;
  }>;
  objectifs: Array<{
    nom: string;
    actuel: number;
    cible: number;
    pourcentage: number;
  }>;
  notificationsNonLues: number;
};

/**
 * Construit le résumé financier de l'utilisateur connecté.
 * Chaque requête est scopée par `userId` via les services existants :
 * aucun accès aux données d'autrui (ni soldes, ni emails, ni hash).
 */
export async function getFinanceSnapshot(
  userId: string,
): Promise<FinanceSnapshot> {
  const [accountsRes, txRes, budgetsRes, goalsRes, unread] = await Promise.all([
    listAccounts(userId),
    listTransactions(userId, { page: 1, pageSize: 20, sort: "date_desc" }),
    listBudgets(userId, currentMonth()),
    listGoals(userId),
    getUnreadCount(userId).catch(() => 0),
  ]);

  const accounts = accountsRes.data ?? [];
  const soldeTotal = Math.round(
    accounts.reduce((s, a) => s + Number(a.balance), 0) * 100,
  ) / 100;

  return {
    devise: "MGA",
    soldeTotal,
    comptes: accounts.map((a) => ({
      nom: a.name,
      type: a.type,
      solde: Number(a.balance),
    })),
    transactionsRecentes: (txRes.data?.items ?? []).map((t) => ({
      date: t.date.slice(0, 10),
      description: t.description,
      montant: Number(t.amount),
      type: t.type,
      compte:
        t.toAccount != null
          ? `${t.account.name} → ${t.toAccount.name}`
          : t.account.name,
      categorie: t.category?.name ?? null,
    })),
    budgetsMois: (budgetsRes.data?.budgets ?? []).map((b) => ({
      nom: b.name,
      plafond: Number(b.amountLimit),
      depense: b.spent,
      pourcentage: b.percent,
    })),
    objectifs: (goalsRes.data ?? []).map((g) => ({
      nom: g.name,
      actuel: Number(g.currentAmount),
      cible: Number(g.targetAmount),
      pourcentage: g.percent,
    })),
    notificationsNonLues: unread,
  };
}

/**
 * Prompt système : rôle + garde-fou « périmètre applicatif ».
 * Le modèle ne reçoit QUE le résumé ci-dessus : il ne peut ni voir
 * ni citer les données d'un autre utilisateur. Toute question sans
 * rapport avec les finances personnelles ou l'utilisation de Financia
 * doit être refusée poliment en une phrase.
 */
export function buildSystemPrompt(snapshot: FinanceSnapshot): string {
  return [
    "Tu es l'assistant intégré de Financia, une application de gestion",
    "financière personnelle (devise unique : Ariary, MGA).",
    "Tu réponds en français, de façon concise, en texte brut sans",
    "mise en forme markdown, avec les chiffres exacts",
    "fournis ci-dessous quand la question porte sur les données.",
    "",
    "PÉRIMÈTRE STRICT : tu ne réponds QU'aux questions en rapport avec",
    "les finances personnelles de l'utilisateur ou l'utilisation de",
    "l'application Financia (comptes, transactions, budgets, objectifs,",
    "transferts, notifications, paramètres). Pour toute autre question",
    "(culture générale, code, devoirs, santé, droit, actualités, etc.),",
    "refuse poliment en UNE phrase et propose un exemple de question",
    "adaptée. N'invente jamais de chiffres : si une donnée manque, dis-le.",
    "",
    `DONNÉES DE L'UTILISATEUR (JSON) : ${JSON.stringify(snapshot)}`,
  ].join("\n");
}

type FetchImpl = (
  input: string,
  init?: RequestInit,
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

type AskDeps = {
  /** Surchargé dans les tests (stub réseau). */
  fetcher?: FetchImpl;
  apiKey?: string;
  model?: string;
};

/**
 * Interroge l'assistant : validation Zod, snapshot scopé, appel Groq
 * (API compatible OpenAI). Ne lève jamais : tout échec devient `{error}`.
 */
export async function askAssistant(
  userId: string,
  rawInput: unknown,
  deps: AskDeps = {},
): Promise<AssistantResult<{ reply: string }>> {
  const parsed = chatInputSchema.safeParse(rawInput);
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const input: ChatInput = parsed.data;

  const apiKey = deps.apiKey ?? process.env.GROQ_API_KEY;
  if (!apiKey) {
    return {
      error:
        "Assistant IA non configuré : renseignez GROQ_API_KEY côté serveur.",
    };
  }
  const model = deps.model ?? process.env.GROQ_MODEL ?? DEFAULT_GROQ_MODEL;
  const fetcher: FetchImpl = deps.fetcher ?? fetch;

  const snapshot = await getFinanceSnapshot(userId);
  const messages: ChatMessage[] = [
    ...input.history.slice(-10),
    { role: "user", content: input.message },
  ];

  let payload: unknown;
  try {
    const res = await fetcher("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 800,
        // Les modèles gpt-oss raisonnent avant de répondre : effort réduit
        // pour laisser la place à la réponse visible (sinon contenu vide).
        reasoning_effort: "low",
        messages: [
          { role: "system", content: buildSystemPrompt(snapshot) },
          ...messages,
        ],
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      // Remonte un diagnostic précis côté serveur, message sobre côté client.
      let code: string | null = null;
      try {
        const errBody = (await res.json()) as {
          error?: { code?: unknown };
        };
        if (typeof errBody?.error?.code === "string") code = errBody.error.code;
      } catch {
        code = null;
      }
      console.error("[assistant] Groq error", res.status, code ?? "unknown");
      if (res.status === 401 || res.status === 403) {
        return { error: "Clé API Groq invalide." };
      }
      if (res.status === 429) {
        return {
          error: "Assistant momentanément saturé, réessayez dans une minute.",
        };
      }
      if (code === "model_not_found" || code === "model_decommissioned") {
        return {
          error: "Modèle IA inconnu : vérifiez GROQ_MODEL côté serveur.",
        };
      }
      return { error: "L'assistant est indisponible pour le moment." };
    }
    payload = await res.json();
  } catch {
    return { error: "L'assistant est indisponible pour le moment." };
  }

  const reply =
    typeof payload === "object" &&
    payload !== null &&
    "choices" in payload &&
    Array.isArray((payload as { choices: unknown }).choices) &&
    typeof (payload as { choices: Array<{ message?: { content?: unknown } }> })
      .choices[0]?.message?.content === "string"
      ? (
          payload as {
            choices: Array<{ message?: { content?: string } }>;
          }
        ).choices[0].message!.content!.trim()
      : null;

  if (!reply) return { error: "Réponse vide de l'assistant, réessayez." };
  return { data: { reply } };
}
