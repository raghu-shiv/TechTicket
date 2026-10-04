import type { TicketSla } from "@/types/tickets";
import { getSlaWarningThresholdMs, isSlaWarning } from "@/lib/sla-warning";

export type SlaTimerState = "RUNNING" | "COMPLETED" | "OVERDUE" | "BREACHED";

export interface SlaTimerResult {
  state: SlaTimerState;
  remainingMs: number;
  elapsedMs: number;
  dueAt: string;
  completedAt: string | null;
  breachedAt: string | null;
  warningThresholdMs: number;
  isWarning: boolean;
}

export function getSlaTimer(
  startedAt: string,
  dueAt: string,
  completedAt: string | null,
  breachedAt: string | null,
  now = Date.now(),
): SlaTimerResult {
  const startMs = new Date(startedAt).getTime();
  const dueMs = new Date(dueAt).getTime();
  const completedMs = completedAt ? new Date(completedAt).getTime() : null;
  const breachedTimestampMs = breachedAt
    ? new Date(breachedAt).getTime()
    : null;

  const originalDurationMs = Math.max(0, dueMs - startMs);
  const warningThresholdMs = getSlaWarningThresholdMs(originalDurationMs);

  if (completedMs !== null) {
    const remainingMs = Math.max(0, dueMs - completedMs);

    return {
      state: breachedTimestampMs !== null ? "BREACHED" : "COMPLETED",
      remainingMs,
      elapsedMs: Math.max(0, completedMs - startMs),
      dueAt,
      completedAt,
      breachedAt,
      warningThresholdMs,
      isWarning:
        breachedTimestampMs === null &&
        isSlaWarning(remainingMs, originalDurationMs),
    };
  }

  if (breachedTimestampMs !== null) {
    return {
      state: "BREACHED",
      remainingMs: 0,
      elapsedMs: Math.max(0, now - startMs),
      dueAt,
      completedAt,
      breachedAt,
      warningThresholdMs,
      isWarning: false,
    };
  }

  if (now >= dueMs) {
    return {
      state: "OVERDUE",
      remainingMs: 0,
      elapsedMs: Math.max(0, now - startMs),
      dueAt,
      completedAt,
      breachedAt,
      warningThresholdMs,
      isWarning: false,
    };
  }

  const remainingMs = dueMs - now;

  return {
    state: "RUNNING",
    remainingMs,
    elapsedMs: Math.max(0, now - startMs),
    dueAt,
    completedAt,
    breachedAt,
    warningThresholdMs,
    isWarning: isSlaWarning(remainingMs, originalDurationMs),
  };
}

export function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export function getSlaTimerLabel(state: SlaTimerState): string {
  switch (state) {
    case "RUNNING":
      return "Remaining";

    case "COMPLETED":
      return "Completed";

    case "OVERDUE":
      return "Overdue";

    case "BREACHED":
      return "Breached";
  }
}

export function getSlaTimerVariant(
  state: SlaTimerState,
): "success" | "warning" | "danger" | "secondary" {
  switch (state) {
    case "RUNNING":
      return "warning";

    case "COMPLETED":
      return "success";

    case "OVERDUE":
    case "BREACHED":
      return "danger";
  }
}

export function getFirstResponseTimer(
  sla: TicketSla,
  createdAt: string,
  now = Date.now(),
) {
  return getSlaTimer(
    createdAt,
    sla.firstResponseDueAt,
    sla.firstRespondedAt,
    sla.firstResponseBreachedAt,
    now,
  );
}

export function getResolutionTimer(
  sla: TicketSla,
  createdAt: string,
  resolvedAt: string | null,
  now = Date.now(),
) {
  return getSlaTimer(
    createdAt,
    sla.resolutionDueAt,
    resolvedAt,
    sla.resolutionBreachedAt,
    now,
  );
}
