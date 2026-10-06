import type {
  AnalyticsDashboardResponse,
  GetAnalyticsDashboardParams,
} from "@/types/analytics-dashboard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function buildQuery(params: GetAnalyticsDashboardParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export async function getAnalyticsDashboard(
  organizationId: string,
  params: GetAnalyticsDashboardParams = {},
): Promise<AnalyticsDashboardResponse> {
  const query = buildQuery(params);

  const url = new URL(`${API_BASE_URL}/reports/analytics/dashboard`);

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
    let message = "Failed to fetch analytics dashboard";

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

  return response.json() as Promise<AnalyticsDashboardResponse>;
}
