"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
}

const THEMES = [
  { value: "light", label: "Clair", icon: Sun },
  { value: "dark", label: "Sombre", icon: Moon },
  { value: "system", label: "Système", icon: Monitor },
] as const;

/** Apparence : clair / sombre / système (appliqué immédiatement). */
export function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();

  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="radiogroup"
      aria-label="Apparence"
    >
      {THEMES.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(value)}
            className={cn(
              "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-4 text-sm font-medium transition-colors",
              active
                ? "border-primary bg-primary/5 text-foreground"
                : "text-muted-foreground hover:border-foreground/20 hover:text-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
