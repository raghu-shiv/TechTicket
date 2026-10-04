"use client";

import { Clock3, XCircle } from "lucide-react";

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

  const breached =
    firstResponse.state === "BREACHED" || resolution.state === "BREACHED";

  if (breached) {
    return (
      <Badge variant="danger">
        <XCircle className="size-3.5" />
        SLA breached
      </Badge>
    );
  }

  if (firstResponse.state === "OVERDUE" || resolution.state === "OVERDUE") {
    return (
      <Badge variant="danger">
        <Clock3 className="size-3.5" />
        SLA overdue
      </Badge>
    );
  }

  if (resolution.state === "RUNNING") {
    return (
      <Badge variant="warning">
        <Clock3 className="size-3.5" />
        {formatDuration(resolution.remainingMs)}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <Clock3 className="size-3.5" />
      SLA
    </Badge>
  );
}
