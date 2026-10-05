import type {
  SlaDashboardResponse,
  SlaDashboardView,
} from "@/types/sla-dashboard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface GetSlaDashboardParams {
  view?: SlaDashboardView;
  page?: number;
  limit?: number;
  priority?: string;
  teamId?: string;
  createdFrom?: string;
  createdTo?: string;
}

function buildQuery(params: GetSlaDashboardParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export async function getSlaDashboard(
  organizationId: string,
  params: GetSlaDashboardParams = {},
): Promise<SlaDashboardResponse> {
  const query = buildQuery(params);

  const url = new URL(`${API_BASE_URL}/reports/sla/dashboard`);

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
    let message = "Failed to fetch SLA dashboard";

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

  return response.json() as Promise<SlaDashboardResponse>;
}
