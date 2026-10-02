"use client";

import { useQuery } from "@tanstack/react-query";

import { getTicket } from "@/lib/api/tickets";

export const ticketQueryKeys = {
  all: ["ticket"] as const,

  detail: (organizationId: string, ticketId: string) =>
    [...ticketQueryKeys.all, "detail", organizationId, ticketId] as const,
};

export function useTicket(
  organizationId: string | undefined,
  ticketId: string,
) {
  return useQuery({
    queryKey: organizationId
      ? ticketQueryKeys.detail(organizationId, ticketId)
      : [...ticketQueryKeys.all, "detail", "disabled", ticketId],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return getTicket(organizationId, ticketId);
    },

    enabled: Boolean(organizationId && ticketId),
  });
}
