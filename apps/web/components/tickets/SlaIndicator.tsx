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

type SlaIndicatorPresentation =
  | {
      state: "BREACHED";
      label: "SLA breached";
    }
  | {
      state: "OVERDUE";
      label: "SLA overdue";
    }
  | {
      state: "FIRST_RESPONSE";
      remainingMs: number;
    }
  | {
      state: "RESOLUTION";
      remainingMs: number;
    }
  | {
      state: "COMPLETED";
      label: "SLA completed";
    }
  | {
      state: "DEFAULT";
      label: "SLA";
    };

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

  const presentation = getSlaIndicatorPresentation(firstResponse, resolution);

  switch (presentation.state) {
    case "BREACHED":
      return (
        <Badge variant="danger">
          <XCircle className="size-3.5" />
          {presentation.label}
        </Badge>
      );

    case "OVERDUE":
      return (
        <Badge variant="danger">
          <Clock3 className="size-3.5" />
          {presentation.label}
        </Badge>
      );

    case "FIRST_RESPONSE":
      return (
        <Badge variant="warning">
          <Clock3 className="size-3.5" />
          Response {formatDuration(presentation.remainingMs)}
        </Badge>
      );

    case "RESOLUTION":
      return (
        <Badge variant="warning">
          <Clock3 className="size-3.5" />
          SLA {formatDuration(presentation.remainingMs)}
        </Badge>
      );

    case "COMPLETED":
      return (
        <Badge variant="success">
          <CheckCircle2 className="size-3.5" />
          {presentation.label}
        </Badge>
      );

    case "DEFAULT":
      return (
        <Badge variant="secondary">
          <Clock3 className="size-3.5" />
          {presentation.label}
        </Badge>
      );
  }
}

export function getSlaIndicatorPresentation(
  firstResponse: ReturnType<typeof getFirstResponseTimer>,
  resolution: ReturnType<typeof getResolutionTimer>,
): SlaIndicatorPresentation {
  if (firstResponse.state === "BREACHED" || resolution.state === "BREACHED") {
    return {
      state: "BREACHED",
      label: "SLA breached",
    };
  }

  if (firstResponse.state === "OVERDUE" || resolution.state === "OVERDUE") {
    return {
      state: "OVERDUE",
      label: "SLA overdue",
    };
  }

  if (firstResponse.state === "RUNNING") {
    return {
      state: "FIRST_RESPONSE",
      remainingMs: firstResponse.remainingMs,
    };
  }

  if (resolution.state === "RUNNING") {
    return {
      state: "RESOLUTION",
      remainingMs: resolution.remainingMs,
    };
  }

  if (firstResponse.state === "COMPLETED" && resolution.state === "COMPLETED") {
    return {
      state: "COMPLETED",
      label: "SLA completed",
    };
  }

  return {
    state: "DEFAULT",
    label: "SLA",
  };
}
