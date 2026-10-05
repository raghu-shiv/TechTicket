"use client";

import { AlertTriangle, CheckCircle2, Clock3, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useSlaClock } from "@/hooks/use-sla-clock";
import {
  formatDuration,
  getFirstResponseTimer,
  getResolutionTimer,
  getSlaBreachLabel,
  getSlaBreachTypes,
} from "@/lib/sla";
import type { Ticket } from "@/types/tickets";

interface TicketSlaPanelProps {
  ticket: Ticket;
}

export function TicketSlaPanel({ ticket }: TicketSlaPanelProps) {
  const now = useSlaClock(30000);

  if (!ticket.sla) {
    return (
      <section className="rounded-lg border bg-card p-5">
        <div className="mb-4">
          <h2 className="text-base font-semibold">Service Level Agreement</h2>
          <p className="text-sm text-muted-foreground">
            SLA tracking information
          </p>
        </div>

        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          No SLA snapshot is attached to this ticket.
        </div>
      </section>
    );
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

  return (
    <section className="rounded-lg border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Service Level Agreement</h2>
        <p className="text-sm text-muted-foreground">
          SLA tracking information
        </p>
      </div>

      <div className="space-y-4">
        <SlaTimerCard title="First Response" timer={firstResponse} />

        <SlaTimerCard title="Resolution" timer={resolution} />

        {getSlaBreachTypes(ticket.sla).length > 0 && (
          <SlaBreachSummary sla={ticket.sla} />
        )}
      </div>
    </section>
  );
}

interface SlaTimerCardProps {
  title: string;
  timer: ReturnType<typeof getFirstResponseTimer>;
}

function SlaTimerCard({ title, timer }: SlaTimerCardProps) {
  const isBreached = timer.state === "BREACHED";
  const isOverdue = timer.state === "OVERDUE";
  const isCompleted = timer.state === "COMPLETED";
  const isWarning = timer.isWarning && timer.state === "RUNNING";

  return (
    <div className="rounded-md border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>

          <p className="mt-1 text-xs text-muted-foreground">
            Due {formatSlaDate(timer.dueAt)}
          </p>
        </div>

        <SlaStateBadge
          isWarning={isWarning}
          isBreached={isBreached}
          isOverdue={isOverdue}
          isCompleted={isCompleted}
        />
      </div>

      <div className="mt-4">
        {isCompleted ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-success" />

            <span className="text-sm font-medium">Completed</span>
          </div>
        ) : isBreached ? (
          <div className="flex items-center gap-2">
            <XCircle className="size-4 text-destructive" />

            <span className="text-sm font-medium text-destructive">
              Breached
            </span>
          </div>
        ) : isOverdue ? (
          <div className="flex items-center gap-2">
            <Clock3 className="size-4 text-destructive" />

            <span className="text-sm font-medium text-destructive">
              Overdue
            </span>
          </div>
        ) : (
          <div className="space-y-1">
            <p
              className={
                isWarning
                  ? "text-xl font-semibold text-warning"
                  : "text-xl font-semibold"
              }
            >
              {formatDuration(timer.remainingMs)}
            </p>

            <p className="text-xs text-muted-foreground">
              {isWarning ? "Remaining before SLA target" : "Remaining"}
            </p>
          </div>
        )}
      </div>

      {isWarning && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />

          <div>
            <p className="text-sm font-medium text-warning">SLA warning</p>

            <p className="mt-0.5 text-xs text-muted-foreground">
              This SLA is within the warning threshold.
            </p>
          </div>
        </div>
      )}

      {isCompleted && timer.completedAt && (
        <p className="mt-3 text-xs text-muted-foreground">
          Completed {formatSlaDate(timer.completedAt)}
        </p>
      )}

      {isBreached && timer.breachedAt && (
        <p className="mt-3 text-xs text-muted-foreground">
          Breached {formatSlaDate(timer.breachedAt)}
        </p>
      )}
    </div>
  );
}

interface SlaStateBadgeProps {
  isWarning: boolean;
  isBreached: boolean;
  isOverdue: boolean;
  isCompleted: boolean;
}

function SlaStateBadge({
  isWarning,
  isBreached,
  isOverdue,
  isCompleted,
}: SlaStateBadgeProps) {
  if (isBreached) {
    return (
      <Badge variant="danger">
        <XCircle className="size-3.5" />
        Breached
      </Badge>
    );
  }

  if (isOverdue) {
    return (
      <Badge variant="danger">
        <Clock3 className="size-3.5" />
        Overdue
      </Badge>
    );
  }

  if (isCompleted) {
    return (
      <Badge variant="success">
        <CheckCircle2 className="size-3.5" />
        Completed
      </Badge>
    );
  }

  if (isWarning) {
    return (
      <Badge variant="warning">
        <AlertTriangle className="size-3.5" />
        Warning
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <Clock3 className="size-3.5" />
      Running
    </Badge>
  );
}

function formatSlaDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

interface SlaBreachSummaryProps {
  sla: NonNullable<Ticket["sla"]>;
}

function SlaBreachSummary({ sla }: SlaBreachSummaryProps) {
  const breachTypes = getSlaBreachTypes(sla);

  if (breachTypes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 size-4 shrink-0 text-destructive" />

        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-destructive">
              SLA breach detected
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              One or more SLA targets were breached for this ticket.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {breachTypes.map((type) => {
              const breachedAt =
                type === "FIRST_RESPONSE"
                  ? sla.firstResponseBreachedAt
                  : sla.resolutionBreachedAt;

              return (
                <div
                  key={type}
                  className="rounded-md border border-destructive/20 bg-background px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="danger">
                      <XCircle className="size-3.5" />
                      {getSlaBreachLabel(type)}
                    </Badge>
                  </div>

                  {breachedAt && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Breached {formatSlaDate(breachedAt)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
