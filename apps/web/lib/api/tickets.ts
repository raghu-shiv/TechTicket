import type {
  Ticket,
  TicketActivityCategory,
  TicketActivityResponse,
  TicketActivityType,
  TicketListParams,
  TicketListResponse,
} from "@/types/tickets";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function buildQueryString(params: TicketListParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export async function getTickets(
  organizationId: string,
  params: TicketListParams = {},
): Promise<TicketListResponse> {
  const queryString = buildQueryString(params);

  const url = new URL(`${API_BASE_URL}/tickets`);

  if (queryString) {
    url.search = queryString;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Failed to fetch tickets";

    try {
      const error = (await response.json()) as {
        message?: string | string[];
      };

      if (Array.isArray(error.message)) {
        message = error.message.join(", ");
      } else if (error.message) {
        message = error.message;
      }
    } catch {
      // Keep the default error message when the response is not JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TicketListResponse>;
}

export async function getTicket(
  organizationId: string,
  ticketId: string,
): Promise<Ticket> {
  const response = await fetch(`${API_BASE_URL}/tickets/${ticketId}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Failed to fetch ticket";

    try {
      const error = (await response.json()) as {
        message?: string | string[];
      };

      if (Array.isArray(error.message)) {
        message = error.message.join(", ");
      } else if (error.message) {
        message = error.message;
      }
    } catch {
      // Keep the default error message when the response is not JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<Ticket>;
}

export async function getTicketActivity(
  organizationId: string,
  ticketId: string,
  params: {
    page?: number;
    limit?: number;
    category?: TicketActivityCategory;
    type?: TicketActivityType;
    actorId?: string;
  } = {},
): Promise<TicketActivityResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  const url = new URL(`${API_BASE_URL}/tickets/${ticketId}/activity`);

  const queryString = searchParams.toString();

  if (queryString) {
    url.search = queryString;
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Failed to fetch ticket activity";

    try {
      const error = (await response.json()) as {
        message?: string | string[];
      };

      if (Array.isArray(error.message)) {
        message = error.message.join(", ");
      } else if (error.message) {
        message = error.message;
      }
    } catch {
      // Keep the default error message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TicketActivityResponse>;
}
