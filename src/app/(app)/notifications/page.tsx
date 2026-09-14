import type { Metadata } from "next";
import { Bell } from "lucide-react";

import { PagePlaceholder } from "@/components/app/page-placeholder";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Alertes, rappels et mises à jour.",
};

export default function NotificationsPage() {
  return (
    <PagePlaceholder
      icon={Bell}
      title="Notifications"
      description="Alertes de budget, rappels et mises à jour de vos objectifs."
    />
  );
}
