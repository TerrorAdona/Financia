import { redirect } from "next/navigation";

/** Ancienne route conservée par compatibilité : renvoie vers /settings. */
export default function ParametresPage() {
  redirect("/settings");
}
