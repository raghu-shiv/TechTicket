"use client";

import { useQuery } from "@tanstack/react-query";

import { getTicketAttachments } from "@/lib/api/tickets";

export const ticketAttachmentQueryKeys = {
  all: ["ticket-attachments"] as const,

  list: (organizationId: string, ticketId: string) =>
    [
      ...ticketAttachmentQueryKeys.all,
      "list",
      organizationId,
      ticketId,
    ] as const,
};

export function useTicketAttachments(
  organizationId: string | undefined,
  ticketId: string,
) {
  return useQuery({
    queryKey:
      organizationId && ticketId
        ? ticketAttachmentQueryKeys.list(organizationId, ticketId)
        : [...ticketAttachmentQueryKeys.all, "list", "disabled", ticketId],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required.");
      }

      return getTicketAttachments(organizationId, ticketId);
    },

    enabled: Boolean(organizationId && ticketId),
  });
}
