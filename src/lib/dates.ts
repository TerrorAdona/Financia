/** Fuseau de référence de l'application (Antananarivo, UTC+3, sans DST). */
export const APP_TIME_ZONE = "Indian/Antananarivo";

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: APP_TIME_ZONE,
});

/** "2026-09-14T..." -> "14 sept. 2026". */
export function formatShortDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return shortDate.format(d);
}

/** Date du jour au format "AAAA-MM-JJ" dans le fuseau de l'app. */
export function todayInputValue(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("fr-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: APP_TIME_ZONE,
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** "2026-09-14T08:00:00..." -> "2026-09-14" (pour <input type="date">). */
export function toInputDateValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayInputValue();
  return todayInputValue(d);
}
