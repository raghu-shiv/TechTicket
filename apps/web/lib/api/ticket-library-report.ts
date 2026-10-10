import type {
  TicketLibraryReportParams,
  TicketLibraryReportResponse,
} from "@/types/ticket-library-report";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function buildQueryString(params: TicketLibraryReportParams): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false
    ) {
      return;
    }

    search.set(key, String(value));
  });

  return search.toString();
}

export async function getTicketLibraryReport(
  organizationId: string,
  params: TicketLibraryReportParams = {},
): Promise<TicketLibraryReportResponse> {
  const url = new URL(`${API_BASE_URL}/reports/analytics/ticket-library`);
  const queryString = buildQueryString(params);

  if (queryString) url.search = queryString;

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
    let message = "Failed to fetch Ticket Library report";

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
      // Preserve the fallback when the response isn't JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TicketLibraryReportResponse>;
}
