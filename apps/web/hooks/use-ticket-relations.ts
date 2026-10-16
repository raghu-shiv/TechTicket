"use client";

import { useQuery } from "@tanstack/react-query";

import { getTicketRelations } from "@/lib/api/tickets";

export const ticketRelationQueryKeys = {
  all: ["ticket-relations"] as const,

  list: (organizationId: string, ticketId: string) =>
    [...ticketRelationQueryKeys.all, "list", organizationId, ticketId] as const,
};

export function useTicketRelations(
  organizationId: string | undefined,
  ticketId: string,
) {
  return useQuery({
    queryKey: organizationId
      ? ticketRelationQueryKeys.list(organizationId, ticketId)
      : [...ticketRelationQueryKeys.all, "list", "disabled", ticketId],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required.");
      }

      return getTicketRelations(organizationId, ticketId);
    },

    enabled: Boolean(organizationId && ticketId),
  });
}
