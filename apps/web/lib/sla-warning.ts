export const SLA_WARNING_THRESHOLD_RATIO = 0.2;

export function getSlaWarningThresholdMs(originalDurationMs: number): number {
  if (originalDurationMs <= 0) {
    return 0;
  }

  return originalDurationMs * SLA_WARNING_THRESHOLD_RATIO;
}

export function isSlaWarning(
  remainingMs: number,
  originalDurationMs: number,
): boolean {
  if (remainingMs <= 0 || originalDurationMs <= 0) {
    return false;
  }

  return remainingMs <= getSlaWarningThresholdMs(originalDurationMs);
}
