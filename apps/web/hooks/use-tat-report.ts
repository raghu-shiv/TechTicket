"use client";

import { useQuery } from "@tanstack/react-query";

import { getTatReport, type GetTatReportParams } from "@/lib/api/tat-report";

export function useTatReport(
  organizationId: string | undefined,
  params: GetTatReportParams = {},
) {
  return useQuery({
    queryKey: ["tat-report", organizationId, params],
    queryFn: () => getTatReport(organizationId!, params),
    enabled: Boolean(organizationId),
  });
}
