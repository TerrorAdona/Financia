"use client";

import { usePathname } from "next/navigation";

import { getNavLabel } from "@/components/app/navigation";
import { NotificationsButton } from "@/components/app/notifications-button";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppTopbar({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger className="-ml-1" aria-label="Basculer le menu" />
      <Separator orientation="vertical" className="h-4" />
      <h1 className="text-sm font-medium">{getNavLabel(pathname)}</h1>
      <div className="ml-auto flex items-center gap-1">
        <ThemeToggle />
        <NotificationsButton unreadCount={unreadCount} />
      </div>
    </header>
  );
}
