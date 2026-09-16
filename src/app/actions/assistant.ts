"use server";

import { requireUserId } from "@/lib/auth-helpers";
import type { ChatInput } from "@/lib/assistant-schemas";
import type { AssistantResult } from "@/lib/services/assistant";
import { askAssistant as askAssistantService } from "@/lib/services/assistant";

/** Garde-fou anti-abus : 20 questions max par utilisateur et par 10 minutes. */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const buckets = new Map<string, number[]>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const kept = (buckets.get(userId) ?? []).filter((t) => now - t < WINDOW_MS);
  if (kept.length >= MAX_PER_WINDOW) {
    buckets.set(userId, kept);
    return false;
  }
  kept.push(now);
  buckets.set(userId, kept);
  return true;
}

export async function askAssistantAction(
  input: ChatInput,
): Promise<AssistantResult<{ reply: string }>> {
  const userId = await requireUserId();
  if (!checkRateLimit(userId)) {
    return {
      error: "Trop de questions d'affilée : patientez quelques minutes.",
    };
  }
  return askAssistantService(userId, input);
}
