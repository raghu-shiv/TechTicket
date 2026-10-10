"use client";

import { useQuery } from "@tanstack/react-query";

import { getTicketLibraryReport } from "@/lib/api/ticket-library-report";
import type { TicketLibraryReportParams } from "@/types/ticket-library-report";

export const ticketLibraryReportQueryKeys = {
  all: ["ticket-library-report"] as const,
  report: (organizationId: string, params: TicketLibraryReportParams) =>
    [...ticketLibraryReportQueryKeys.all, organizationId, params] as const,
};

export function useTicketLibraryReport(
  organizationId: string | undefined,
  params: TicketLibraryReportParams = {},
) {
  return useQuery({
    queryKey: organizationId
      ? ticketLibraryReportQueryKeys.report(organizationId, params)
      : [...ticketLibraryReportQueryKeys.all, "disabled"],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return getTicketLibraryReport(organizationId, params);
    },

    enabled: Boolean(organizationId),
    staleTime: 30_000,
  });
}
