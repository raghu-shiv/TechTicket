import type {
  Ticket,
  TicketActivityCategory,
  TicketActivityResponse,
  TicketActivityType,
  TicketAttachment,
  TicketComment,
  TicketCommentType,
  TicketListParams,
  TicketListResponse,
  TicketPriority,
  TicketStatus,
  TicketType,
} from "@/types/tickets";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface CreateTicketInput {
  title: string;
  description: string;
  priority: TicketPriority;
  type: TicketType;
  productId?: string;
}

export interface CreatedTicket {
  id: string;
  ticketNumber: string;
  organizationId: string;
}

async function getApiErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const error = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(error.message) && error.message.length > 0) {
      return error.message.join(", ");
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  } catch {
    // Keep the fallback for a non-JSON or empty response.
  }

  return fallback;
}

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

export async function createTicket(
  organizationId: string,
  input: CreateTicketInput,
): Promise<CreatedTicket> {
  const response = await fetch(`${API_BASE_URL}/tickets`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-organization-id": organizationId,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(response, "Failed to create ticket."),
    );
  }

  return response.json() as Promise<CreatedTicket>;
}

export async function uploadTicketAttachment(
  organizationId: string,
  ticketId: string,
  file: File,
): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/attachments`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "x-organization-id": organizationId,
      },
      body: formData,
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getApiErrorMessage(
        response,
        `Failed to upload attachment "${file.name}".`,
      ),
    );
  }
}

async function getTicketRequestError(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const error = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(error.message)) {
      return error.message.join(", ");
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  } catch {
    // Retain the fallback if the response body is not JSON.
  }

  return fallback;
}

export async function getTicketAttachments(
  organizationId: string,
  ticketId: string,
): Promise<TicketAttachment[]> {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/attachments`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "x-organization-id": organizationId,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getTicketRequestError(
        response,
        "Failed to load ticket attachments.",
      ),
    );
  }

  return response.json() as Promise<TicketAttachment[]>;
}

export async function downloadTicketAttachment(
  organizationId: string,
  ticketId: string,
  attachmentId: string,
): Promise<Blob> {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/attachments/${encodeURIComponent(attachmentId)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "*/*",
        "x-organization-id": organizationId,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getTicketRequestError(
        response,
        "Failed to download the attachment.",
      ),
    );
  }

  return response.blob();
}

export async function updateTicketStatus(
  organizationId: string,
  ticketId: string,
  status: TicketStatus,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/status`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({ status }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getTicketRequestError(response, "Failed to update ticket status."),
    );
  }
}

export async function updateTicketAssignment(
  organizationId: string,
  ticketId: string,
  assigneeId: string | null,
): Promise<void> {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/assignment`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({ assigneeId }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getTicketRequestError(response, "Failed to update assignment."),
    );
  }
}

export async function getTicketComments(
  organizationId: string,
  ticketId: string,
): Promise<TicketComment[]> {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/comments`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "x-organization-id": organizationId,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getTicketRequestError(response, "Failed to load comments."),
    );
  }

  return response.json() as Promise<TicketComment[]>;
}

export async function createTicketComment(
  organizationId: string,
  ticketId: string,
  input: {
    body: string;
    type?: TicketCommentType;
  },
): Promise<TicketComment> {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${encodeURIComponent(ticketId)}/comments`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({
        body: input.body,
        type: input.type ?? "PUBLIC",
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getTicketRequestError(response, "Failed to add comment."),
    );
  }

  return response.json() as Promise<TicketComment>;
}
