"use client";

import { AlertTriangle, ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { useSlaClock } from "@/hooks/use-sla-clock";
import {
  formatDuration,
  getFirstResponseTimer,
  getResolutionTimer,
} from "@/lib/sla";
import type { TicketSla } from "@/types/tickets";

interface TicketSlaPanelProps {
  sla: TicketSla | null;
  createdAt: string;
  resolvedAt: string | null;
}

function TimerBlock({
  title,
  value,
  state,
}: {
  title: string;
  value: string;
  state: "running" | "completed" | "overdue" | "breached";
}) {
  const variant =
    state === "completed"
      ? "success"
      : state === "breached" || state === "overdue"
        ? "danger"
        : "warning";

  const label =
    state === "completed"
      ? "Completed"
      : state === "breached"
        ? "Breached"
        : state === "overdue"
          ? "Overdue"
          : "Remaining";

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{title}</p>

        <Badge variant={variant}>{label}</Badge>
      </div>

      <p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export function TicketSlaPanel({
  sla,
  createdAt,
  resolvedAt,
}: TicketSlaPanelProps) {
  const now = useSlaClock();

  if (!sla) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6">
          <ShieldCheck className="size-5 text-muted-foreground" />

          <div>
            <p className="text-sm font-medium">SLA</p>

            <p className="text-xs text-muted-foreground">
              No SLA snapshot is attached to this ticket.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const firstResponse = getFirstResponseTimer(sla, createdAt, now);

  const resolution = getResolutionTimer(sla, createdAt, resolvedAt, now);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-muted-foreground" />

          <CardTitle className="text-sm">SLA</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <TimerBlock
          title="First response"
          value={
            firstResponse.state === "RUNNING"
              ? formatDuration(firstResponse.remainingMs)
              : formatDuration(firstResponse.elapsedMs)
          }
          state={
            firstResponse.state === "RUNNING"
              ? "running"
              : firstResponse.state === "COMPLETED"
                ? "completed"
                : firstResponse.state === "BREACHED"
                  ? "breached"
                  : "overdue"
          }
        />

        <TimerBlock
          title="Resolution"
          value={
            resolution.state === "RUNNING"
              ? formatDuration(resolution.remainingMs)
              : formatDuration(resolution.elapsedMs)
          }
          state={
            resolution.state === "RUNNING"
              ? "running"
              : resolution.state === "COMPLETED"
                ? "completed"
                : resolution.state === "BREACHED"
                  ? "breached"
                  : "overdue"
          }
        />

        {(firstResponse.state === "BREACHED" ||
          resolution.state === "BREACHED") && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />

            <span>This ticket has breached one or more SLA targets.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
