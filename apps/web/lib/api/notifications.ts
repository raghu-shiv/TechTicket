import type {
  NotificationListItem,
  NotificationListResponse,
} from "@/types/notifications";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface GetNotificationsParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }

    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // Keep the fallback when the response is not JSON.
  }

  return fallback;
}

async function notificationRequest<T>(
  organizationId: string,
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallback));
  }

  return response.json() as Promise<T>;
}

export function getNotifications(
  organizationId: string,
  params: GetNotificationsParams = {},
): Promise<NotificationListResponse> {
  const query = new URLSearchParams({
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 20),
  });

  if (params.unreadOnly !== undefined) {
    query.set("unreadOnly", String(params.unreadOnly));
  }

  return notificationRequest(
    organizationId,
    `/notifications?${query.toString()}`,
    { method: "GET" },
    "Failed to load notifications.",
  );
}

export function markNotificationRead(
  organizationId: string,
  notificationId: string,
): Promise<NotificationListItem> {
  return notificationRequest(
    organizationId,
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    { method: "PATCH" },
    "Failed to mark the notification as read.",
  );
}

export const notificationQueryKeys = {
  all: ["notifications"] as const,

  organization: (organizationId: string) =>
    [...notificationQueryKeys.all, organizationId] as const,

  list: (organizationId: string, params: GetNotificationsParams) =>
    [
      ...notificationQueryKeys.organization(organizationId),
      "list",
      params,
    ] as const,
};
