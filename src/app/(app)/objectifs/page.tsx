import type { Metadata } from "next";
import { Target } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Objectifs",
  description: "Créez des objectifs d'épargne.",
};

export default function ObjectifsPage() {
  return (
    <PagePlaceholder
      icon={Target}
      title="Objectifs"
      description="Créez des objectifs d'épargne et visualisez votre progression."
    />
  );
}
