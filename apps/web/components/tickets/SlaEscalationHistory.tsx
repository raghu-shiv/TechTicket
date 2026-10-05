"use client";

import { AlertTriangle, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  getSlaEscalationBreachLabel,
  sortSlaEscalations,
} from "@/lib/sla-escalation";
import type { TicketSlaEscalation } from "@/types/tickets";

interface SlaEscalationHistoryProps {
  escalations: TicketSlaEscalation[];
}

function formatEscalationDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function SlaEscalationHistory({
  escalations,
}: SlaEscalationHistoryProps) {
  const sortedEscalations = sortSlaEscalations(escalations);

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">Escalation records</h3>

          <p className="mt-1 text-xs text-muted-foreground">
            Persisted SLA escalation events for this ticket.
          </p>
        </div>

        {sortedEscalations.length > 0 && (
          <Badge variant="danger">
            {sortedEscalations.length}{" "}
            {sortedEscalations.length === 1 ? "escalation" : "escalations"}
          </Badge>
        )}
      </div>

      {sortedEscalations.length === 0 ? (
        <div className="flex items-center gap-3 rounded-md border border-dashed p-4">
          <Clock3 className="size-4 text-muted-foreground" />

          <div>
            <p className="text-sm font-medium">No escalation records</p>

            <p className="text-xs text-muted-foreground">
              No persisted SLA escalation has been recorded for this ticket.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedEscalations.map((escalation) => (
            <div
              key={escalation.id}
              className="flex items-start gap-3 rounded-md border p-3"
            >
              <div className="mt-0.5 rounded-full border p-1.5">
                <AlertTriangle className="size-3.5 text-destructive" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium">
                    {getSlaEscalationBreachLabel(escalation.type)}
                  </p>

                  <Badge variant="danger">Escalated</Badge>
                </div>

                <p className="mt-1 text-xs text-muted-foreground">
                  {formatEscalationDate(escalation.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
