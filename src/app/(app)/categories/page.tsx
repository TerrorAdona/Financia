import type { Metadata } from "next";
import { Tags } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Catégories",
  description: "Organisez vos transactions par catégories.",
};

export default function CategoriesPage() {
  return (
    <PagePlaceholder
      icon={Tags}
      title="Catégories"
      description="Organisez vos transactions avec des catégories personnalisées."
    />
  );
}
