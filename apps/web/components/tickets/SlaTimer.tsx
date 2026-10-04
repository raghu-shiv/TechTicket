"use client";

import { CheckCircle2, Clock3, TimerReset, XCircle } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  formatDuration,
  getSlaTimerLabel,
  getSlaTimerVariant,
  type SlaTimerResult,
} from "@/lib/sla";

interface SlaTimerProps {
  title: string;
  timer: SlaTimerResult;
}

function TimerIcon({ state }: { state: SlaTimerResult["state"] }) {
  switch (state) {
    case "COMPLETED":
      return <CheckCircle2 className="size-4" />;

    case "BREACHED":
      return <XCircle className="size-4" />;

    case "OVERDUE":
      return <TimerReset className="size-4" />;

    case "RUNNING":
      return <Clock3 className="size-4" />;
  }
}

export function SlaTimer({ title, timer }: SlaTimerProps) {
  const label = getSlaTimerLabel(timer.state);

  const duration =
    timer.state === "COMPLETED"
      ? timer.elapsedMs
      : timer.state === "RUNNING"
        ? timer.remainingMs
        : timer.elapsedMs;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">{title}</CardTitle>

          <Badge variant={getSlaTimerVariant(timer.state)}>
            <TimerIcon state={timer.state} />
            {label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">
          {formatDuration(duration)}
        </p>

        <p className="mt-1 text-xs text-muted-foreground">
          {timer.state === "RUNNING"
            ? "Time remaining"
            : timer.state === "COMPLETED"
              ? "Elapsed time"
              : "Elapsed time"}
        </p>
      </CardContent>
    </Card>
  );
}
