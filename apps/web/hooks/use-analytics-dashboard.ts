"use client";

import { useQuery } from "@tanstack/react-query";

import { getAnalyticsDashboard } from "@/lib/api/analytics-dashboard";
import type { GetAnalyticsDashboardParams } from "@/types/analytics-dashboard";

export const analyticsDashboardQueryKeys = {
  all: ["analytics-dashboard"] as const,

  dashboard: (organizationId: string, params: GetAnalyticsDashboardParams) =>
    [...analyticsDashboardQueryKeys.all, organizationId, params] as const,
};

export function useAnalyticsDashboard(
  organizationId: string | undefined,
  params: GetAnalyticsDashboardParams = {},
) {
  return useQuery({
    queryKey: organizationId
      ? analyticsDashboardQueryKeys.dashboard(organizationId, params)
      : [...analyticsDashboardQueryKeys.all, "disabled"],

    queryFn: () => getAnalyticsDashboard(organizationId!, params),

    enabled: Boolean(organizationId),

    staleTime: 30_000,
  });
}
