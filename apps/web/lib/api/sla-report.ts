import type { SlaReportResponse } from "@/types/sla-report";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface GetSlaReportParams {
  from?: string;
  to?: string;
  dateField?: "createdAt" | "updatedAt";

  priority?: string;
  status?: string;
  type?: string;

  teamId?: string;
  assigneeId?: string;
  requesterId?: string;
  productId?: string;

  unassigned?: boolean;
  unassignedTeam?: boolean;
}

function buildQuery(params: GetSlaReportParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export async function getSlaReport(
  organizationId: string,
  params: GetSlaReportParams = {},
): Promise<SlaReportResponse> {
  const query = buildQuery(params);

  const url = new URL(`${API_BASE_URL}/reports/analytics/sla`);

  if (query) {
    url.search = query;
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
    let message = "Failed to fetch SLA report";

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
      // Keep fallback.
    }

    throw new Error(message);
  }

  return response.json() as Promise<SlaReportResponse>;
}
