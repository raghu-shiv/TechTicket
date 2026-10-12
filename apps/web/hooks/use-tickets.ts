"use client";

import { useQuery } from "@tanstack/react-query";

import { getTickets } from "@/lib/api/tickets";
import type { TicketListParams } from "@/types/tickets";

export const ticketsQueryKeys = {
  all: ["tickets"] as const,

  list: (organizationId: string, params: TicketListParams = {}) =>
    [...ticketsQueryKeys.all, "list", organizationId, params] as const,
};

export interface TicketsQueryOptions {
  /** Optional polling interval; omitted to preserve existing ticket-list behavior. */
  refetchInterval?: number | false;

  /** Allow callers such as global search to disable the query temporarily. */
  enabled?: boolean;
}

export function useTickets(
  organizationId: string | undefined,
  params: TicketListParams = {},
  options: TicketsQueryOptions = {},
) {
  return useQuery({
    queryKey: organizationId
      ? ticketsQueryKeys.list(organizationId, params)
      : [...ticketsQueryKeys.all, "list", "disabled", params],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return getTickets(organizationId, params);
    },

    enabled: Boolean(organizationId) && options.enabled !== false,

    refetchInterval: options.refetchInterval,
  });
}
