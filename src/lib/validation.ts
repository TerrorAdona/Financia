/**
 * Extrait le premier message d'erreur d'un résultat Zod `safeParse`.
 * Centralisé ici : tous les services et actions l'utilisent pour des
 * messages d'erreur utilisateur cohérents en français.
 */
export function firstIssue(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "issues" in error &&
    Array.isArray((error as { issues: unknown[] }).issues)
  ) {
    const first = (error as { issues: Array<{ message?: unknown }> }).issues[0];
    if (typeof first?.message === "string") return first.message;
  }
  return "Données invalides.";
}
