"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";

import { ticketActivityQueryKeys } from "@/hooks/use-ticket-activity";
import { ticketQueryKeys } from "@/hooks/use-ticket";
import {
  isSlaRealtimeEventForOrganization,
  isSlaRealtimeEventForTicket,
} from "@/lib/sla-realtime";
import {
  REALTIME_EVENTS,
  type SlaRealtimeEventPayload,
} from "@/types/realtime";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const REALTIME_URL = new URL(API_BASE_URL).origin;

interface UseSlaRealtimeOptions {
  organizationId: string | undefined;
  ticketId?: string;
}

export function useSlaRealtime({
  organizationId,
  ticketId,
}: UseSlaRealtimeOptions) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!organizationId) {
      return;
    }

    const socket: Socket = io(`${REALTIME_URL}/realtime`, {
      withCredentials: true,

      extraHeaders: {
        "x-organization-id": organizationId,
      },
    });

    const handleSlaBreach = (payload: SlaRealtimeEventPayload) => {
      if (!isSlaRealtimeEventForOrganization(payload, organizationId)) {
        return;
      }

      if (ticketId && !isSlaRealtimeEventForTicket(payload, ticketId)) {
        return;
      }

      if (ticketId) {
        void queryClient.invalidateQueries({
          queryKey: ticketQueryKeys.detail(organizationId, ticketId),
        });

        void queryClient.invalidateQueries({
          queryKey: ticketActivityQueryKeys.ticket(organizationId, ticketId),
        });

        return;
      }

      void queryClient.invalidateQueries({
        queryKey: ticketQueryKeys.all,
      });
    };

    socket.on(REALTIME_EVENTS.SLA_FIRST_RESPONSE_BREACHED, handleSlaBreach);

    socket.on(REALTIME_EVENTS.SLA_RESOLUTION_BREACHED, handleSlaBreach);

    return () => {
      socket.off(REALTIME_EVENTS.SLA_FIRST_RESPONSE_BREACHED, handleSlaBreach);

      socket.off(REALTIME_EVENTS.SLA_RESOLUTION_BREACHED, handleSlaBreach);

      socket.disconnect();
    };
  }, [organizationId, ticketId, queryClient]);
}
