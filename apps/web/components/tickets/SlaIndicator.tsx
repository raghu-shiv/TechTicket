"use client";

import { CheckCircle2, Clock3, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSlaClock } from "@/hooks/use-sla-clock";
import {
  formatDuration,
  getFirstResponseTimer,
  getResolutionTimer,
} from "@/lib/sla";
import type { Ticket } from "@/types/tickets";

export function SlaIndicator({ ticket }: { ticket: Ticket }) {
  const now = useSlaClock(30000);

  if (!ticket.sla) {
    return null;
  }

  const firstResponse = getFirstResponseTimer(
    ticket.sla,
    ticket.createdAt,
    now,
  );

  const resolution = getResolutionTimer(
    ticket.sla,
    ticket.createdAt,
    ticket.resolvedAt,
    now,
  );

  /*
   * --------------------------------------------------------------------------
   * BREACHED
   * --------------------------------------------------------------------------
   *
   * A server-recorded breach takes precedence over every other state.
   */

  if (firstResponse.state === "BREACHED" || resolution.state === "BREACHED") {
    return (
      <Badge variant="danger">
        <XCircle className="size-3.5" />
        SLA breached
      </Badge>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * OVERDUE
   * --------------------------------------------------------------------------
   *
   * The client may detect that the due time has passed before the
   * background SLA monitor has persisted the breach timestamp.
   */

  if (firstResponse.state === "OVERDUE" || resolution.state === "OVERDUE") {
    return (
      <Badge variant="danger">
        <Clock3 className="size-3.5" />
        SLA overdue
      </Badge>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * FIRST RESPONSE STILL RUNNING
   * --------------------------------------------------------------------------
   *
   * This is important when resolution is already completed but the first
   * response target is still active in the snapshot.
   */

  if (firstResponse.state === "RUNNING") {
    return (
      <Badge variant="warning">
        <Clock3 className="size-3.5" />
        Response {formatDuration(firstResponse.remainingMs)}
      </Badge>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * RESOLUTION STILL RUNNING
   * --------------------------------------------------------------------------
   */

  if (resolution.state === "RUNNING") {
    return (
      <Badge variant="warning">
        <Clock3 className="size-3.5" />
        SLA {formatDuration(resolution.remainingMs)}
      </Badge>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * COMPLETED
   * --------------------------------------------------------------------------
   */

  if (firstResponse.state === "COMPLETED" && resolution.state === "COMPLETED") {
    return (
      <Badge variant="success">
        <CheckCircle2 className="size-3.5" />
        SLA completed
      </Badge>
    );
  }

  /*
   * --------------------------------------------------------------------------
   * FALLBACK
   * --------------------------------------------------------------------------
   */

  return (
    <Badge variant="secondary">
      <Clock3 className="size-3.5" />
      SLA
    </Badge>
  );
}
