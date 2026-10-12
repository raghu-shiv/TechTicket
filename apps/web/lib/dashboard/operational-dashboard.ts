import type {
  AnalyticsDashboardResponse,
  GetAnalyticsDashboardParams,
} from "@/types/analytics-dashboard";
import type { OrganizationMembership } from "@/types/organizations";
import type { TicketListParams } from "@/types/tickets";

export const ACTIVE_TICKET_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING",
] as const;

export type ActiveTicketStatus = (typeof ACTIVE_TICKET_STATUSES)[number];

export const OPERATIONAL_PRIORITIES = [
  "URGENT",
  "HIGH",
  "MEDIUM",
  "LOW",
] as const;

export type OperationalPriority = (typeof OPERATIONAL_PRIORITIES)[number];

export interface OperationalPriorityPoint {
  key: OperationalPriority;
  label: string;
  count: number;
  percentage: number;
}

export interface ActiveWorkloadSummary {
  activeTickets: number;
  unassignedActiveTickets: number;
  activeSlaBreaches: number;
  priorityDistribution: OperationalPriorityPoint[];
}

export interface TicketVolumePoint {
  date: string;
  count: number;
}

export interface WeeklyTicketComparison {
  currentTotal: number;
  previousTotal: number;
  changePercentage: number | null;
}

export type DashboardDataState = "loading" | "error" | "unavailable" | "ready";

export function dashboardDataState<T>(query: {
  isLoading: boolean;
  isError: boolean;
  data: T | undefined;
}): DashboardDataState {
  if (query.isError) return "error";
  if (query.isLoading) return "loading";
  if (query.data === undefined) return "unavailable";
  return "ready";
}

/**
 * Requesters should see their own operational data in the dashboard. The API
 * still receives the organization ID separately and must enforce membership.
 * A corresponding server-side guard is applied to dashboard analytics and
 * ticket-list queries, so a client-supplied requesterId cannot widen access.
 */
export function buildRoleScopedAnalyticsParams(
  membership: Pick<OrganizationMembership, "role" | "userId">,
  params: GetAnalyticsDashboardParams = {},
): GetAnalyticsDashboardParams {
  if (membership.role !== "REQUESTER") return { ...params };

  return {
    ...params,
    requesterId: membership.userId,
  };
}

export function buildRoleScopedTicketParams(
  membership: Pick<OrganizationMembership, "role" | "userId">,
  params: TicketListParams = {},
): TicketListParams {
  if (membership.role !== "REQUESTER") return { ...params };

  return {
    ...params,
    requesterId: membership.userId,
  };
}

export function getPriorityLabel(priority: string): string {
  switch (priority) {
    case "URGENT":
      return "Urgent";
    case "HIGH":
      return "High";
    case "MEDIUM":
      return "Medium";
    case "LOW":
      return "Low";
    default:
      return priority
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, (character) => character.toUpperCase());
  }
}

/**
 * The analytics API returns actual grouped counts for one selected status.
 * Combining OPEN, IN_PROGRESS, and PENDING gives the live active workload
 * without treating resolved/closed historical tickets as current work.
 */
export function aggregateActiveWorkload(
  responses: Record<ActiveTicketStatus, AnalyticsDashboardResponse>,
): ActiveWorkloadSummary {
  const statusResponses = ACTIVE_TICKET_STATUSES.map(
    (status) => responses[status],
  );

  const activeTickets = statusResponses.reduce(
    (sum, response) => sum + response.data.metrics.total,
    0,
  );
  const unassignedActiveTickets = statusResponses.reduce(
    (sum, response) => sum + response.data.metrics.unassigned,
    0,
  );
  const activeSlaBreaches = statusResponses.reduce(
    (sum, response) => sum + response.data.metrics.sla.breached,
    0,
  );

  const priorityCounts = new Map<OperationalPriority, number>(
    OPERATIONAL_PRIORITIES.map((priority) => [priority, 0]),
  );

  for (const response of statusResponses) {
    for (const point of response.data.priorityDistribution) {
      if (priorityCounts.has(point.key as OperationalPriority)) {
        const key = point.key as OperationalPriority;
        priorityCounts.set(key, (priorityCounts.get(key) ?? 0) + point.count);
      }
    }
  }

  const priorityDistribution = OPERATIONAL_PRIORITIES.map((key) => {
    const count = priorityCounts.get(key) ?? 0;

    return {
      key,
      label: getPriorityLabel(key),
      count,
      percentage:
        activeTickets === 0
          ? 0
          : Number(((count / activeTickets) * 100).toFixed(1)),
    };
  });

  return {
    activeTickets,
    unassignedActiveTickets,
    activeSlaBreaches,
    priorityDistribution,
  };
}

function asUtcDateKey(value: string): string | null {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

export function createTicketTrendWindow(now: Date = new Date()) {
  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const from = addUtcDays(today, -29);
  const to = new Date(today);
  to.setUTCHours(23, 59, 59, 999);

  return {
    from: from.toISOString(),
    to: to.toISOString(),
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
    today: today.toISOString().slice(0, 10),
  };
}

/** Fill missing dates with zeroes so an absent bucket is represented honestly. */
export function normalizeVolumeTrend(
  points: TicketVolumePoint[],
  from: string,
  to: string,
): TicketVolumePoint[] {
  const startKey = asUtcDateKey(from);
  const endKey = asUtcDateKey(to);
  if (!startKey || !endKey || startKey > endKey) return points;

  const counts = new Map<string, number>();
  for (const point of points) {
    const key = asUtcDateKey(point.date);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + point.count);
  }

  const result: TicketVolumePoint[] = [];
  const start = new Date(`${startKey}T00:00:00.000Z`);
  const end = new Date(`${endKey}T00:00:00.000Z`);
  for (
    const date = new Date(start);
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    const key = date.toISOString().slice(0, 10);
    result.push({ date: `${key}T00:00:00.000Z`, count: counts.get(key) ?? 0 });
  }

  return result;
}

/**
 * Compare the most recent seven complete UTC days with the preceding seven
 * complete UTC days. The current partial day is excluded from both windows.
 */
export function compareWeeklyTicketVolume(
  points: TicketVolumePoint[],
  today: string,
): WeeklyTicketComparison {
  const todayKey = asUtcDateKey(today);
  if (!todayKey) {
    return { currentTotal: 0, previousTotal: 0, changePercentage: null };
  }

  const todayStart = new Date(`${todayKey}T00:00:00.000Z`);
  const currentStartKey = addUtcDays(todayStart, -7).toISOString().slice(0, 10);
  const previousStartKey = addUtcDays(todayStart, -14)
    .toISOString()
    .slice(0, 10);

  let currentTotal = 0;
  let previousTotal = 0;

  for (const point of points) {
    const key = asUtcDateKey(point.date);
    if (!key) continue;

    if (key >= currentStartKey && key < todayKey) {
      currentTotal += point.count;
    } else if (key >= previousStartKey && key < currentStartKey) {
      previousTotal += point.count;
    }
  }

  return {
    currentTotal,
    previousTotal,
    changePercentage:
      previousTotal === 0
        ? null
        : Number(
            (((currentTotal - previousTotal) / previousTotal) * 100).toFixed(1),
          ),
  };
}

export function formatWeeklyComparison(
  comparison: WeeklyTicketComparison,
): string {
  if (comparison.changePercentage === null) {
    return "No prior-period baseline";
  }

  const change = comparison.changePercentage;
  const formatted = change > 0 ? `+${change.toFixed(1)}` : change.toFixed(1);
  return `${formatted}% vs previous 7 days`;
}
