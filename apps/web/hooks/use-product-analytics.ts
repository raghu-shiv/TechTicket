"use client";

import { useQuery } from "@tanstack/react-query";

import { getProductAnalytics } from "@/lib/api/product-analytics";
import type { GetProductAnalyticsParams } from "@/types/product-analytics";

export const productAnalyticsQueryKeys = {
  all: ["product-analytics"] as const,

  dashboard: (organizationId: string, params: GetProductAnalyticsParams) =>
    [...productAnalyticsQueryKeys.all, organizationId, params] as const,
};

export function useProductAnalytics(
  organizationId: string | undefined,
  params: GetProductAnalyticsParams = {},
) {
  return useQuery({
    queryKey: organizationId
      ? productAnalyticsQueryKeys.dashboard(organizationId, params)
      : [...productAnalyticsQueryKeys.all, "disabled"],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return getProductAnalytics(organizationId, params);
    },

    enabled: Boolean(organizationId),

    staleTime: 30_000,
  });
}
