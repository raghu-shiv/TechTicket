"use client";

import { useQuery } from "@tanstack/react-query";

import { getEmployeeDashboard } from "@/lib/api/employee-dashboard";
import type { GetEmployeeDashboardParams } from "@/types/employee-dashboard";

export function useEmployeeDashboard(
  organizationId: string | undefined,
  params: GetEmployeeDashboardParams = {},
  canView = true,
) {
  return useQuery({
    queryKey: ["employee-dashboard", organizationId, params],
    queryFn: () => getEmployeeDashboard(organizationId!, params),
    enabled: Boolean(organizationId) && canView,
  });
}
