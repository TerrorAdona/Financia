"use client";

import { Check, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { NotificationDTO } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";
import {
  formatNotificationDate,
  getNotificationKind,
} from "@/components/notifications/notification-kind";

export function NotificationItem({
  notification,
  marking,
  onMarkAsRead,
  onDeleteRequest,
}: {
  notification: NotificationDTO;
  marking: boolean;
  onMarkAsRead: (id: string) => void;
  onDeleteRequest: (notification: NotificationDTO) => void;
}) {
  const kind = getNotificationKind(notification);
  const Icon = kind.icon;

  return (
    <Card
      className={cn(
        "transition-colors",
        !notification.isRead && "border-primary/40 bg-primary/[0.03]",
      )}
    >
      <CardContent className="flex gap-3 py-4">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            kind.iconWrap,
          )}
          aria-hidden="true"
        >
          <Icon className="size-5" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {!notification.isRead ? (
              <span
                className="size-2 shrink-0 rounded-full bg-primary"
                aria-label="Non lue"
                title="Non lue"
              />
            ) : null}
            <p className="min-w-0 flex-1 truncate text-sm font-semibold">
              {notification.title}
            </p>
          </div>

          <p className="text-sm break-words text-muted-foreground">
            {notification.message}
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <Badge variant="secondary" className={cn("border-0", kind.badge)}>
              {kind.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatNotificationDate(notification.createdAt)}
            </span>
            {notification.isRead ? (
              <span className="text-xs text-muted-foreground">· Lue</span>
            ) : (
              <span className="text-xs font-medium text-primary">· Non lue</span>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            {!notification.isRead ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={marking}
                onClick={() => onMarkAsRead(notification.id)}
                aria-label={`Marquer comme lue : ${notification.title}`}
              >
                <Check className="size-4" aria-hidden="true" />
                {marking ? "Lecture…" : "Marquer comme lue"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => onDeleteRequest(notification)}
              aria-label={`Supprimer : ${notification.title}`}
              title="Supprimer"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              Supprimer
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
