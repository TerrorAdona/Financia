"use client";

import { Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { askAssistantAction } from "@/app/actions/assistant";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChatMessage } from "@/lib/assistant-schemas";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Quel est mon solde total ?",
  "Combien ai-je dépensé ce mois-ci ?",
  "Où en sont mes objectifs ?",
];

type DisplayMessage = ChatMessage;

export function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, pending, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open ]);

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    const next: DisplayMessage[] = [
      ...messages.slice(-9),
      { role: "user", content: message.slice(0, 500) },
    ];
    setMessages(next);
    setDraft("");
    setPending(true);
    try {
      const result = await askAssistantAction({
        message,
        history: messages.slice(-9),
      });
      if (result.error || !result.data) {
        setError(result.error ?? "Réponse impossible.");
        setMessages(next.slice(0, -1));
        setDraft(message);
        return;
      }
      setMessages([...next, { role: "assistant", content: result.data.reply }]);
    } catch {
      setError("L'assistant est indisponible pour le moment.");
      setMessages(next.slice(0, -1));
      setDraft(message);
    } finally {
      setPending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <Button
        type="button"
        size="icon-lg"
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant Financia"}
        title="Assistant Financia"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-4 bottom-4 z-50 rounded-full shadow-lg sm:right-6 sm:bottom-6"
      >
        {open ? (
          <X className="size-5" aria-hidden="true" />
        ) : (
          <Sparkles className="size-5" aria-hidden="true" />
        )}
      </Button>

      {open ? (
        <Card
          role="dialog"
          aria-label="Assistant Financia"
          className="fixed right-4 bottom-20 z-50 flex max-h-[65vh] w-[min(92vw,24rem)] flex-col sm:right-6 sm:bottom-24"
        >
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-primary" aria-hidden="true" />
              Assistant Financia
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Vos questions sur vos finances — en Ariary.
            </p>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
            <div
              ref={listRef}
              role="log"
              aria-live="polite"
              aria-label="Conversation"
              className="flex min-h-40 flex-1 flex-col gap-2 overflow-y-auto pr-1"
            >
              {messages.length === 0 && !pending ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center">
                  <p className="max-w-60 text-sm text-muted-foreground">
                    Je vois vos comptes, budgets et objectifs. Posez-moi vos
                    questions finances :
                  </p>
                  <div className="flex flex-col gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => void send(s)}
                        className="rounded-full border px-3 py-1.5 text-xs transition-colors hover:bg-muted"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {messages.map((m, i) => (
                <div
                  key={`${i}-${m.role}`}
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap",
                    m.role === "user"
                      ? "self-end bg-primary text-primary-foreground"
                      : "self-start bg-muted text-foreground",
                  )}
                >
                  {m.content}
                </div>
              ))}
              {pending ? (
                <p className="self-start text-sm text-muted-foreground" role="status">
                  L&apos;assistant réfléchit…
                </p>
              ) : null}
            </div>

            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void send(draft);
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Votre question finances…"
                maxLength={500}
                autoComplete="off"
                // Ignore les extensions d'écriture (ex. Grammarly) : elles
                // lisent la sélection du champ à l'envoi et plantent
                // (getRangeAt) quand celui-ci est vidé/re-focusé.
                data-gramm="false"
                aria-label="Votre question"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending}
              />
              <Button
                type="submit"
                size="icon"
                disabled={pending || draft.trim().length === 0}
                aria-label="Envoyer"
              >
                <Send className="size-4" aria-hidden="true" />
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}
