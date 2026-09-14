"use client";

import Link from "next/link";
import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function NotificationsButton({ unreadCount }: { unreadCount: number }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      aria-label={
        unreadCount > 0
          ? `${unreadCount} notification(s) non lue(s)`
          : "Notifications"
      }
      title="Notifications"
      render={<Link href="/notifications" />}
      className="relative"
    >
      <Bell className="size-4" aria-hidden="true" />
      {unreadCount > 0 ? (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none"
        >
          {unreadCount > 9 ? "9+" : unreadCount}
        </Badge>
      ) : null}
    </Button>
  );
}
