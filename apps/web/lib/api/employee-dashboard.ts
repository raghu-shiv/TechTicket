import type {
  EmployeeDashboardResponse,
  GetEmployeeDashboardParams,
} from "@/types/employee-dashboard";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function buildQuery(params: GetEmployeeDashboardParams): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  return search.toString();
}

export async function getEmployeeDashboard(
  organizationId: string,
  params: GetEmployeeDashboardParams = {},
): Promise<EmployeeDashboardResponse> {
  const url = new URL(`${API_BASE_URL}/reports/analytics/employees`);
  const query = buildQuery(params);
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
    let message = "Failed to fetch Employee Dashboard";
    try {
      const body = (await response.json()) as {
        message?: string | string[];
      };
      if (Array.isArray(body.message)) message = body.message.join(", ");
      else if (body.message) message = body.message;
    } catch {
      // Keep the fallback message when the response is not JSON.
    }
    throw new Error(message);
  }

  return response.json() as Promise<EmployeeDashboardResponse>;
}
