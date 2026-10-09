import type { TatReportResponse } from "@/types/tat-report";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface GetTatReportParams {
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

  page?: number;
  limit?: number;
}

function buildQuery(params: GetTatReportParams): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    search.set(key, String(value));
  }

  return search.toString();
}

export async function getTatReport(
  organizationId: string,
  params: GetTatReportParams = {},
): Promise<TatReportResponse> {
  const query = buildQuery(params);
  const url = new URL(`${API_BASE_URL}/reports/analytics/tat`);

  if (query) url.search = query;

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
    let message = "Failed to fetch TAT report";

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
      // Keep the fallback error message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<TatReportResponse>;
}
