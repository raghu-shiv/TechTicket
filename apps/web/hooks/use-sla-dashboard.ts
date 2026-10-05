"use client";

import { useQuery } from "@tanstack/react-query";

import {
  getSlaDashboard,
  type GetSlaDashboardParams,
} from "@/lib/api/sla-dashboard";

export const slaDashboardQueryKeys = {
  all: ["sla-dashboard"] as const,

  dashboard: (organizationId: string, params: GetSlaDashboardParams) =>
    [...slaDashboardQueryKeys.all, organizationId, params] as const,
};

export function useSlaDashboard(
  organizationId: string | undefined,
  params: GetSlaDashboardParams = {},
) {
  return useQuery({
    queryKey: organizationId
      ? slaDashboardQueryKeys.dashboard(organizationId, params)
      : [...slaDashboardQueryKeys.all, "disabled"],

    queryFn: () => getSlaDashboard(organizationId!, params),

    enabled: Boolean(organizationId),

    staleTime: 30_000,
  });
}
