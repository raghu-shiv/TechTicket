"use client";

import { useQuery } from "@tanstack/react-query";

import { getSlaReport, type GetSlaReportParams } from "@/lib/api/sla-report";

export function useSlaReport(
  organizationId: string | undefined,
  params: GetSlaReportParams = {},
) {
  return useQuery({
    queryKey: ["sla-report", organizationId, params],
    queryFn: () => getSlaReport(organizationId!, params),
    enabled: Boolean(organizationId),
  });
}
