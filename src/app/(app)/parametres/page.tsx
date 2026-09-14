import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Paramètres",
  description: "Préférences du compte et de l'application.",
};

export default function ParametresPage() {
  return (
    <PagePlaceholder
      icon={Settings}
      title="Paramètres"
      description="Préférences du compte, devise, apparence et notifications."
    />
  );
}
