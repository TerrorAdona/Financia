export type ShellUser = {
  name: string | null;
  email: string | null;
};

/** Initiales pour l'avatar : "Aina Rakoto" -> "AR", sinon 1re lettre de l'email. */
export function getInitials(name: string | null, email: string | null): string {
  const fromName = (name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  if (fromName) return fromName;
  return email?.[0]?.toUpperCase() ?? "?";
}
