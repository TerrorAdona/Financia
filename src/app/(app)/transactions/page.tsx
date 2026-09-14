import type { Metadata } from "next";
import { ArrowLeftRight } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Transactions",
  description: "Suivez vos revenus et dépenses.",
};

export default function TransactionsPage() {
  return (
    <PagePlaceholder
      icon={ArrowLeftRight}
      title="Transactions"
      description="Suivez vos revenus et dépenses, filtrez par compte, catégorie et période."
    />
  );
}
