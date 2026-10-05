"use client";

import { useQuery } from "@tanstack/react-query";

import { getTicketActivity } from "@/lib/api/tickets";
import type {
  TicketActivityCategory,
  TicketActivityType,
} from "@/types/tickets";

export const ticketActivityQueryKeys = {
  all: ["ticket-activity"] as const,

  list: (
    organizationId: string,
    ticketId: string,
    params: {
      page?: number;
      limit?: number;
      category?: TicketActivityCategory;
      type?: TicketActivityType;
      actorId?: string;
    } = {},
  ) =>
    [
      ...ticketActivityQueryKeys.all,
      "list",
      organizationId,
      ticketId,
      params,
    ] as const,
};

export function useTicketActivity(
  organizationId: string | undefined,
  ticketId: string,
  params: {
    page?: number;
    limit?: number;
    category?: TicketActivityCategory;
    type?: TicketActivityType;
    actorId?: string;
  } = {},
) {
  return useQuery({
    queryKey: organizationId
      ? ticketActivityQueryKeys.list(organizationId, ticketId, params)
      : [...ticketActivityQueryKeys.all, "list", "disabled", ticketId, params],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return getTicketActivity(organizationId, ticketId, params);
    },

    enabled: Boolean(organizationId && ticketId),
  });
}
