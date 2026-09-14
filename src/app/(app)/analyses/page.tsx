import type { Metadata } from "next";
import { ChartColumn } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Analyses",
  description: "Graphiques et statistiques financières.",
};

export default function AnalysesPage() {
  return (
    <PagePlaceholder
      icon={ChartColumn}
      title="Analyses"
      description="Graphiques et statistiques pour comprendre vos habitudes financières."
    />
  );
}
