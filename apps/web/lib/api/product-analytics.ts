import type {
  GetProductAnalyticsParams,
  ProductAnalyticsResponse,
} from "@/types/product-analytics";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

function buildQuery(params: GetProductAnalyticsParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    searchParams.set(key, String(value));
  });

  return searchParams.toString();
}

export async function getProductAnalytics(
  organizationId: string,
  params: GetProductAnalyticsParams = {},
): Promise<ProductAnalyticsResponse> {
  const query = buildQuery(params);

  const url = new URL(`${API_BASE_URL}/reports/analytics/products`);

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
    let message = "Failed to fetch product analytics";

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
      // Keep fallback message.
    }

    throw new Error(message);
  }

  return response.json() as Promise<ProductAnalyticsResponse>;
}
