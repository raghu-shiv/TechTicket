"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
} from "lucide-react";
import { io, type Socket } from "socket.io-client";

import { useOrganizations } from "@/hooks/use-organizations";
import {
  getNotifications,
  markNotificationRead,
  notificationQueryKeys,
} from "@/lib/api/notifications";
import { REALTIME_EVENTS } from "@/types/realtime";
import type { NotificationRealtimePayload } from "@/types/notifications";

const PAGE_SIZE = 10;

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const REALTIME_URL = new URL(API_BASE_URL).origin;

function formatNotificationDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getErrorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isNotificationRealtimePayload(
  value: unknown,
): value is NotificationRealtimePayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;

  return (
    typeof payload.notificationId === "string" &&
    typeof payload.organizationId === "string" &&
    typeof payload.recipientId === "string"
  );
}

export function NotificationBell() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [page, setPage] = useState(1);

  const organizationsQuery = useOrganizations();
  const membership = organizationsQuery.data?.[0];
  const organizationId = membership?.organizationId;
  const userId = membership?.userId;

  const queryParams = {
    page,
    limit: PAGE_SIZE,
  };

  const notificationsQuery = useQuery({
    queryKey: organizationId
      ? notificationQueryKeys.list(organizationId, queryParams)
      : [...notificationQueryKeys.all, "disabled"],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required.");
      }

      return getNotifications(organizationId, queryParams);
    },

    enabled: Boolean(organizationId),
  });

  const markReadMutation = useMutation({
    mutationFn: (notificationId: string) => {
      if (!organizationId) {
        throw new Error("Organization context is required.");
      }

      return markNotificationRead(organizationId, notificationId);
    },

    onSuccess: async () => {
      if (!organizationId) return;

      await queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.organization(organizationId),
      });
    },
  });

  // Subscribe to events only for the currently selected organization.
  // Backend room membership is also bound to the authenticated user and org.
  useEffect(() => {
    if (!organizationId || !userId) {
      return;
    }

    const socket: Socket = io(`${REALTIME_URL}/realtime`, {
      withCredentials: true,
      extraHeaders: {
        "x-organization-id": organizationId,
      },
    });

    function handleRealtimeNotification(payload: unknown) {
      if (!isNotificationRealtimePayload(payload)) {
        return;
      }

      if (
        payload.organizationId !== organizationId ||
        payload.recipientId !== userId
      ) {
        return;
      }

      void queryClient.invalidateQueries({
        queryKey: notificationQueryKeys.organization(organizationId),
      });
    }

    socket.on(REALTIME_EVENTS.NOTIFICATION_CREATED, handleRealtimeNotification);

    socket.on(REALTIME_EVENTS.NOTIFICATION_UPDATED, handleRealtimeNotification);

    return () => {
      socket.off(
        REALTIME_EVENTS.NOTIFICATION_CREATED,
        handleRealtimeNotification,
      );

      socket.off(
        REALTIME_EVENTS.NOTIFICATION_UPDATED,
        handleRealtimeNotification,
      );

      socket.disconnect();
    };
  }, [organizationId, userId, queryClient]);

  // Close the dropdown on Escape or an outside pointer interaction.
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
        bellRef.current?.focus();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      const root = rootRef.current;
      const target = event.target;

      if (root && target instanceof Node && !root.contains(target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  const response = notificationsQuery.data;
  const notifications = response?.data ?? [];
  const unreadCount = response?.meta.unreadCount ?? 0;
  const totalPages = Math.max(response?.meta.totalPages ?? 1, 1);

  function toggleDropdown() {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);

    if (nextOpen) {
      void organizationsQuery.refetch();

      if (organizationId) {
        void notificationsQuery.refetch();
      }
    }
  }

  function openTicket(
    ticketId: string,
    notificationId: string,
    isRead: boolean,
  ) {
    if (!isRead) {
      markReadMutation.mutate(notificationId);
    }

    setIsOpen(false);
    router.push(`/tickets/${encodeURIComponent(ticketId)}`);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={bellRef}
        type="button"
        onClick={toggleDropdown}
        className="relative inline-flex size-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="notification-center-panel"
        title="Notifications"
      >
        <Bell className="size-5" aria-hidden="true" />

        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="notification-center-panel"
          role="dialog"
          aria-label="Notification center"
          aria-modal="false"
          className="absolute right-0 top-full z-50 mt-2 flex max-h-[min(75vh,38rem)] w-[min(92vw,26rem)] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-xl"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-muted/20 px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold">Notifications</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {unreadCount} unread
              </p>
            </div>

            <button
              type="button"
              onClick={() => void notificationsQuery.refetch()}
              disabled={notificationsQuery.isFetching}
              className="rounded-lg px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            >
              {notificationsQuery.isFetching ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {organizationsQuery.isLoading && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground"
            >
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading workspace...
            </div>
          )}

          {organizationsQuery.isError && (
            <div
              className="mx-3 my-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4"
              role="alert"
            >
              <p className="text-sm font-medium">Unable to load workspace</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {organizationsQuery.error.message}
              </p>
              <button
                type="button"
                onClick={() => void organizationsQuery.refetch()}
                className="mt-3 text-xs font-medium text-primary underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}

          {!organizationsQuery.isLoading &&
            !organizationsQuery.isError &&
            !organizationId && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                Join an organization to receive notifications.
              </p>
            )}

          {organizationId && notificationsQuery.isLoading && (
            <div
              role="status"
              className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground"
            >
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading notifications...
            </div>
          )}

          {organizationId && notificationsQuery.isError && (
            <div
              className="mx-3 my-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-4"
              role="alert"
            >
              <p className="text-sm font-medium">
                Unable to load notifications
              </p>
              <p className="mt-1 break-words text-xs text-muted-foreground">
                {getErrorText(
                  notificationsQuery.error,
                  "The notification list could not be loaded.",
                )}
              </p>
              <button
                type="button"
                onClick={() => void notificationsQuery.refetch()}
                className="mt-3 text-xs font-medium text-primary underline underline-offset-4"
              >
                Retry
              </button>
            </div>
          )}

          {markReadMutation.isError && (
            <p
              className="border-b border-destructive/20 bg-destructive/5 px-4 py-2.5 text-xs text-destructive"
              role="alert"
            >
              {getErrorText(
                markReadMutation.error,
                "Unable to update notification state.",
              )}
            </p>
          )}

          {organizationId &&
            notificationsQuery.isSuccess &&
            notifications.length === 0 && (
              <div className="px-4 py-12 text-center">
                <Bell
                  className="mx-auto size-6 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="mt-3 text-sm font-medium">
                  You&apos;re all caught up
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  New notifications will appear here.
                </p>
              </div>
            )}

          {organizationId &&
            notificationsQuery.isSuccess &&
            notifications.length > 0 && (
              <div className="min-h-0 flex-1 overflow-y-auto">
                {notifications.map((notification) => (
                  <article
                    key={notification.id}
                    className={[
                      "border-b border-border px-4 py-4 transition-colors hover:bg-muted/30 last:border-b-0",
                      notification.readAt ? "bg-card" : "bg-primary/[0.05]",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className={[
                          "mt-1.5 size-2 shrink-0 rounded-full",
                          notification.readAt ? "bg-transparent" : "bg-primary",
                        ].join(" ")}
                      />

                      <div className="min-w-0 flex-1">
                        <p
                          className={[
                            "text-sm",
                            notification.readAt
                              ? "font-medium"
                              : "font-semibold",
                          ].join(" ")}
                        >
                          {notification.title}
                        </p>

                        <p className="mt-1 text-sm leading-5 text-muted-foreground">
                          {notification.message}
                        </p>

                        {notification.ticket && (
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {notification.ticket.ticketNumber}
                            {" · "}
                            {notification.ticket.title}
                          </p>
                        )}

                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <time
                            dateTime={notification.createdAt}
                            className="text-[11px] text-muted-foreground"
                          >
                            {formatNotificationDate(notification.createdAt)}
                          </time>

                          {notification.ticketId && (
                            <button
                              type="button"
                              onClick={() => {
                                const ticketId = notification.ticketId;

                                if (!ticketId) {
                                  return;
                                }

                                openTicket(
                                  ticketId,
                                  notification.id,
                                  Boolean(notification.readAt),
                                );
                              }}
                              className="text-xs font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                            >
                              Open ticket
                            </button>
                          )}

                          {!notification.readAt && (
                            <button
                              type="button"
                              disabled={markReadMutation.isPending}
                              onClick={() =>
                                markReadMutation.mutate(notification.id)
                              }
                              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
                            >
                              <Check className="size-3" aria-hidden="true" />
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

          {organizationId && notificationsQuery.isSuccess && totalPages > 1 && (
            <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-3 py-2.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronLeft className="size-3.5" aria-hidden="true" />
                Newer
              </button>

              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
              >
                Older
                <ChevronRight className="size-3.5" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
