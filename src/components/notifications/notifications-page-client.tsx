"use client";

import { useRouter } from "next/navigation";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { markAllNotificationsAsReadAction, markNotificationAsReadAction } from "@/app/actions/notifications";
import { DeleteNotificationDialog } from "@/components/notifications/delete-notification-dialog";
import { NotificationItem } from "@/components/notifications/notification-item";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NotificationDTO } from "@/lib/services/notifications";
import { cn } from "@/lib/utils";

type Filter = "all" | "unread" | "read";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "unread", label: "Non lues" },
  { key: "read", label: "Lues" },
];

export function NotificationsPageClient({
  initialNotifications,
  initialUnreadCount,
}: {
  initialNotifications: NotificationDTO[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [items, setItems] = useState<NotificationDTO[]>(initialNotifications);
  const [filter, setFilter] = useState<Filter>("all");
  const [markingIds, setMarkingIds] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NotificationDTO | null>(null);

  const unreadCount = items.filter((n) => !n.isRead).length;

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.isRead);
    if (filter === "read") return items.filter((n) => n.isRead);
    return items;
  }, [items, filter]);

  const markAsRead = async (id: string) => {
    setMarkingIds((prev) => new Set(prev).add(id));
    const result = await markNotificationAsReadAction(id);
    setMarkingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (result.error || !result.data) {
      toast.error(result.error ?? "Impossible de marquer comme lue.");
      return;
    }
    setItems((prev) => prev.map((n) => (n.id === id ? result.data! : n)));
    router.refresh();
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    const result = await markAllNotificationsAsReadAction();
    setMarkingAll(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    const count = result.data?.count ?? 0;
    setItems((prev) =>
      prev.map((n) => ({
        ...n,
        isRead: true,
        readAt: n.readAt ?? new Date().toISOString(),
      })),
    );
    toast.success(
      count === 0
        ? "Aucune notification à marquer."
        : `${count} notification${count > 1 ? "s" : ""} marquée${count > 1 ? "s" : ""} comme lue${count > 1 ? "s" : ""}.`,
    );
    router.refresh();
  };

  const handleDeleted = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground" role="status">
            {items.length === 0
              ? "Aucune notification pour le moment."
              : unreadCount > 0
                ? `${unreadCount} non lue${unreadCount > 1 ? "s" : ""} sur ${items.length}.`
                : `${items.length} notification${items.length > 1 ? "s" : ""}, toutes lues.`}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void markAllAsRead()}
          disabled={markingAll || unreadCount === 0}
        >
          <CheckCheck className="size-4" aria-hidden="true" />
          {markingAll ? "Lecture…" : "Tout marquer comme lu"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Filtrer les notifications">
        {FILTERS.map((f) => {
          const count =
            f.key === "unread"
              ? unreadCount
              : f.key === "read"
                ? items.length - unreadCount
                : items.length;
          return (
            <Button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={filter === f.key}
              variant={filter === f.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f.key)}
              className={cn(filter === f.key && "pointer-events-none")}
            >
              {f.label}
              <Badge
                variant="secondary"
                className={cn(
                  "ml-1 border-0",
                  filter === f.key && "bg-primary-foreground/20 text-inherit",
                )}
              >
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      {/* État vide : aucun élément du tout */}
      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <Bell className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">Aucune notification</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Les alertes de budget (50 %, 75 %, 90 %, dépassé), les objectifs
              (proche, atteint) et les transactions importantes apparaîtront
              ici automatiquement.
            </p>
          </div>
        </div>
      ) : visible.length === 0 ? (
        /* État vide filtré */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-16 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-muted">
            <BellOff className="size-7 text-muted-foreground" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="font-medium">
              {filter === "unread" ? "Aucune notification non lue" : "Aucune notification lue"}
            </p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {filter === "unread"
                ? "Vous êtes à jour ! Toutes vos notifications ont été lues."
                : "Marquez une notification comme lue pour la retrouver ici."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={() => setFilter("all")}>
            Voir toutes les notifications
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Liste des notifications">
          {visible.map((notification) => (
            <li key={notification.id}>
              <NotificationItem
                notification={notification}
                marking={markingIds.has(notification.id)}
                onMarkAsRead={(id) => void markAsRead(id)}
                onDeleteRequest={setDeleteTarget}
              />
            </li>
          ))}
        </ul>
      )}

      {/* État initial SSR : compteur serveur ( SEO / premier rendu ) */}
      <p className="sr-only" aria-live="polite">
        {initialUnreadCount} notification(s) non lue(s) au chargement.
      </p>

      <DeleteNotificationDialog
        notification={deleteTarget}
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        onDeleted={handleDeleted}
      />
    </section>
  );
}
