import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";
import { AssistantChat } from "@/components/assistant/assistant-chat";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { prisma } from "@/lib/prisma";

/**
 * Layout de l'espace connecté : protection par session + shell applicatif
 * (sidebar permanente sur desktop, drawer sur mobile, topbar).
 * Toutes les pages héritent de la protection — aucune page (app) n'est
 * accessible sans session valide.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const [user, unreadCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, image: true },
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return (
    <SidebarProvider>
      <AppSidebar
        user={{
          name: user?.name ?? session.user.name ?? null,
          email: user?.email ?? session.user.email ?? null,
          image: user?.image ?? session.user.image ?? null,
        }}
      />
      <SidebarInset>
        <AppTopbar unreadCount={unreadCount} />
        <main className="flex flex-1 flex-col gap-4 p-4 sm:p-6">
          {children}
        </main>
      </SidebarInset>
      <Toaster richColors closeButton />
      <AssistantChat />
    </SidebarProvider>
  );
}
