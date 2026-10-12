import type {
  CreateTicketLibraryEntryInput,
  TicketLibraryResponse,
  UpdateTicketLibraryEntryInput,
  TicketLibraryEntry,
} from "@/types/ticket-library";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function errorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (typeof body.message === "string" && body.message.trim())
      return body.message;
  } catch {
    // Preserve fallback when response is not JSON.
  }
  return fallback;
}

async function request<T>(
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
  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  return response.json() as Promise<T>;
}

export function getTicketLibraryEntries(
  organizationId: string,
  params: {
    search?: string;
    productId?: string;
    page?: number;
    limit?: number;
  } = {},
): Promise<TicketLibraryResponse> {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "")
      searchParams.set(key, String(value));
  }
  const query = searchParams.toString();
  return request(
    organizationId,
    `/ticket-library${query ? `?${query}` : ""}`,
    { method: "GET" },
    "Failed to load Ticket Library articles.",
  );
}

export function createTicketLibraryEntry(
  organizationId: string,
  input: CreateTicketLibraryEntryInput,
): Promise<TicketLibraryEntry> {
  return request(
    organizationId,
    "/ticket-library",
    { method: "POST", body: JSON.stringify(input) },
    "Failed to create the knowledge article.",
  );
}

export function updateTicketLibraryEntry(
  organizationId: string,
  entryId: string,
  input: UpdateTicketLibraryEntryInput,
): Promise<TicketLibraryEntry> {
  return request(
    organizationId,
    `/ticket-library/${encodeURIComponent(entryId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    "Failed to update the knowledge article.",
  );
}

export function deleteTicketLibraryEntry(
  organizationId: string,
  entryId: string,
): Promise<{ id: string; deleted: true }> {
  return request(
    organizationId,
    `/ticket-library/${encodeURIComponent(entryId)}`,
    { method: "DELETE" },
    "Failed to delete the knowledge article.",
  );
}

export const ticketLibraryQueryKeys = {
  all: ["ticket-library"] as const,
  list: (
    organizationId: string,
    params: {
      search?: string;
      productId?: string;
      page?: number;
      limit?: number;
    },
  ) => [...ticketLibraryQueryKeys.all, "list", organizationId, params] as const,
};
