import type { Metadata } from "next";
import { PiggyBank } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Budgets",
  description: "Définissez des plafonds par catégorie.",
};

export default function BudgetsPage() {
  return (
    <PagePlaceholder
      icon={PiggyBank}
      title="Budgets"
      description="Définissez des plafonds mensuels par catégorie et suivez leur consommation."
    />
  );
}
