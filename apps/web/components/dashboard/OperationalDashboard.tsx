"use client";

import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  FileCheck2,
  Inbox,
  Ticket as TicketIcon,
  UserX,
} from "lucide-react";
import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared";
import { useAnalyticsDashboard } from "@/hooks/use-analytics-dashboard";
import { useOrganizations } from "@/hooks/use-organizations";
import { useTickets } from "@/hooks/use-tickets";
import {
  aggregateActiveWorkload,
  buildRoleScopedAnalyticsParams,
  buildRoleScopedTicketParams,
  compareWeeklyTicketVolume,
  createTicketTrendWindow,
  dashboardDataState,
  formatWeeklyComparison,
  getPriorityLabel,
  normalizeVolumeTrend,
  type DashboardDataState,
  type OperationalPriorityPoint,
  type TicketVolumePoint,
} from "@/lib/dashboard/operational-dashboard";
import type { Ticket, TicketPriority, TicketStatus } from "@/types/tickets";

const REFRESH_INTERVAL_MS = 30_000;

const statusLabels: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const statusVariants: Record<
  TicketStatus,
  "info" | "warning" | "secondary" | "success" | "outline"
> = {
  OPEN: "info",
  IN_PROGRESS: "warning",
  PENDING: "secondary",
  RESOLVED: "success",
  CLOSED: "outline",
};

const priorityVariants: Record<
  TicketPriority,
  "outline" | "secondary" | "warning" | "danger"
> = {
  LOW: "outline",
  MEDIUM: "secondary",
  HIGH: "warning",
  URGENT: "danger",
};

interface QuickActionItem {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

const quickActions: QuickActionItem[] = [
  {
    title: "Raise Ticket",
    description: "Create a support request",
    href: "/tickets/create",
    icon: TicketIcon,
  },
  {
    title: "My Tickets",
    description: "Review ticket work",
    href: "/tickets",
    icon: Inbox,
  },
  {
    title: "Ticket Library",
    description: "Find saved resolutions",
    href: "/ticket-library",
    icon: BookOpenCheck,
  },
  {
    title: "Approvals",
    description: "Review assigned approvals",
    href: "/approvals",
    icon: FileCheck2,
  },
  {
    title: "SLA Breaches",
    description: "Open breached SLA tickets",
    href: "/tickets?slaBreached=true",
    icon: AlertTriangle,
  },
];

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Update time unavailable";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function MetricCard({
  title,
  icon: Icon,
  state,
  value,
  description,
  comparison,
  onRetry,
}: {
  title: string;
  icon: LucideIcon;
  state: DashboardDataState;
  value?: number;
  description: string;
  comparison?: string;
  onRetry: () => void;
}) {
  const effectiveState: DashboardDataState =
    state === "ready" && value === undefined ? "unavailable" : state;

  const displayedValue =
    effectiveState === "ready"
      ? new Intl.NumberFormat().format(value!)
      : effectiveState === "loading"
        ? "Loading…"
        : "Unavailable";

  const isError = effectiveState === "error";
  const isUnavailable = effectiveState === "unavailable";

  return (
    <Card className="h-full border-border/80 shadow-card">
      <CardContent className="h-full p-5 sm:p-6">
        <div className="flex h-full items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-5 text-muted-foreground">
              {title}
            </p>

            <p
              aria-live="polite"
              className="mt-3 font-display text-3xl font-semibold leading-none tracking-tight text-card-foreground tabular-nums sm:text-4xl"
            >
              {displayedValue}
            </p>

            <p className="mt-3 max-w-xs text-xs leading-5 text-muted-foreground">
              {effectiveState === "ready"
                ? description
                : effectiveState === "loading"
                  ? "Loading live data…"
                  : isError
                    ? "The API request failed. No fallback value is shown."
                    : "The API returned no usable metric."}
            </p>

            {effectiveState === "ready" && comparison && (
              <p className="mt-3 inline-flex max-w-full rounded-lg border border-border/70 bg-surface-muted px-2.5 py-1.5 text-xs font-medium leading-5 text-muted-foreground">
                {comparison}
              </p>
            )}

            {isError && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-3 inline-flex rounded-lg text-xs font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                Retry
              </button>
            )}

            {isUnavailable && (
              <span className="sr-only">Metric unavailable</span>
            )}
          </div>

          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-brand-soft text-brand-soft-foreground">
            <Icon className="size-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickAction({ item }: { item: QuickActionItem }) {
  const Icon = item.icon;

  return (
    <Card className="group h-full overflow-hidden border-border/80 shadow-card transition-[border-color,background-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-popover">
      <CardContent className="h-full p-0">
        <Link
          href={item.href}
          className="flex h-full min-h-28 items-start gap-3.5 rounded-2xl p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:p-5"
        >
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-brand-soft text-brand-soft-foreground transition-colors duration-150 group-hover:border-primary/30">
            <Icon className="size-5" aria-hidden="true" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-sm font-semibold leading-5 text-card-foreground">
              {item.title}
              <ArrowUpRight
                className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>

            <span className="mt-1.5 block text-xs leading-5 text-muted-foreground">
              {item.description}
            </span>
          </span>
        </Link>
      </CardContent>
    </Card>
  );
}

function PriorityDistribution({
  points,
  state,
  onRetry,
}: {
  points?: OperationalPriorityPoint[];
  state: DashboardDataState;
  onRetry: () => void;
}) {
  return (
    <Card className="h-full border-border/80 shadow-card">
      <CardHeader className="pb-4">
        <CardTitle>Active Ticket Priority</CardTitle>
        <p className="text-sm leading-6 text-muted-foreground">
          Open, in-progress, and pending tickets only
        </p>
      </CardHeader>
      <CardContent>
        {state === "loading" ? (
          <LoadingState label="Loading priority distribution…" />
        ) : state === "error" ? (
          <ErrorState
            title="Unable to load priorities"
            description="The workload aggregates could not be loaded."
            onRetry={onRetry}
          />
        ) : state !== "ready" || !points ? (
          <EmptyState
            icon={Activity}
            title="Priority data unavailable"
            description="No priority aggregates were returned by the API."
          />
        ) : points.every((point) => point.count === 0) ? (
          <EmptyState
            icon={TicketIcon}
            title="No active tickets"
            description="The priority distribution will appear when active tickets exist."
          />
        ) : (
          <div className="space-y-5">
            {points.map((point) => (
              <div key={point.key} className="space-y-2.5">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">
                    {point.label}
                  </span>
                  <span className="shrink-0 text-xs font-medium tabular-nums text-muted-foreground">
                    {point.count} · {point.percentage.toFixed(1)}%
                  </span>
                </div>

                <div
                  className="h-2.5 overflow-hidden rounded-full bg-surface-muted"
                  role="progressbar"
                  aria-label={`${point.label} active ticket share`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={point.percentage}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300 ease-standard"
                    style={{ width: `${point.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TicketTrends({
  state,
  points,
  ticketCount,
  onRetry,
}: {
  state: DashboardDataState;
  points: TicketVolumePoint[];
  ticketCount: number | undefined;
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ticket Trends</CardTitle>
        <p className="text-sm text-muted-foreground">
          Tickets created per day over the last 30 calendar days
        </p>
      </CardHeader>
      <CardContent>
        {state === "loading" ? (
          <LoadingState label="Loading ticket trends…" />
        ) : state === "error" ? (
          <ErrorState
            title="Unable to load ticket trends"
            description="The analytics API request failed. No placeholder chart is shown."
            onRetry={onRetry}
          />
        ) : state !== "ready" || ticketCount === undefined ? (
          <EmptyState
            icon={Activity}
            title="Trend data unavailable"
            description="No usable ticket-volume series was returned by the API."
          />
        ) : ticketCount === 0 ? (
          <EmptyState
            icon={Activity}
            title="No ticket activity in this period"
            description="No tickets were created during the last 30 calendar days."
          />
        ) : points.reduce((sum, point) => sum + point.count, 0) !==
          ticketCount ? (
          <ErrorState
            title="Incomplete ticket trend data"
            description="The daily buckets do not reconcile with the API ticket total. Retry to refresh the series."
            onRetry={onRetry}
          />
        ) : (
          <VolumeChart points={points} />
        )}
      </CardContent>
    </Card>
  );
}

function VolumeChart({ points }: { points: TicketVolumePoint[] }) {
  const width = 900;
  const height = 280;
  const padding = { top: 26, right: 24, bottom: 48, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(...points.map((point) => point.count), 1);
  const yAxisSteps = Math.min(Math.max(maximum, 1), 5);
  const formatShortDate = (value: string) =>
    new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
    }).format(new Date(value));
  const formatNumber = (value: number) => new Intl.NumberFormat().format(value);
  const getX = (index: number) =>
    points.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (index / (points.length - 1)) * chartWidth;

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto min-w-[600px] w-full"
        role="img"
        aria-label="Tickets created per day over the last 30 calendar days"
      >
        {Array.from({ length: yAxisSteps + 1 }).map((_, index) => {
          const value = maximum - (index / yAxisSteps) * maximum;
          const y = padding.top + (index / yAxisSteps) * chartHeight;
          return (
            <g key={`grid-${index}`}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                className="stroke-border"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground text-[11px]"
              >
                {formatNumber(Math.round(value))}
              </text>
            </g>
          );
        })}
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={width - padding.right}
          y2={padding.top + chartHeight}
          className="stroke-border"
          strokeWidth="1"
        />
        {points.map((point, index) => {
          const x = getX(index);
          const barWidth = Math.max(
            8,
            Math.min(22, (chartWidth / points.length) * 0.62),
          );
          const barHeight = (point.count / maximum) * chartHeight;
          const y = padding.top + chartHeight - barHeight;
          return (
            <g key={point.date}>
              <title>
                {formatShortDate(point.date)}: {point.count}{" "}
                {point.count === 1 ? "ticket" : "tickets"}
              </title>
              {point.count > 0 && (
                <rect
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  className="fill-primary/75"
                />
              )}
              {(index === 0 ||
                index === points.length - 1 ||
                index % 5 === 0) && (
                <text
                  x={x}
                  y={height - 16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[11px]"
                >
                  {formatShortDate(point.date)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function RecentTickets({
  state,
  tickets,
  onRetry,
}: {
  state: DashboardDataState;
  tickets?: Ticket[];
  onRetry: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Recently Updated Tickets</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Ordered by the persisted updated-at timestamp
            </p>
          </div>
          <Link
            href="/tickets"
            className="shrink-0 text-sm font-medium underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {state === "loading" ? (
          <div className="px-5 pb-5">
            <LoadingState label="Loading recent tickets…" />
          </div>
        ) : state === "error" ? (
          <div className="px-5 pb-5">
            <ErrorState
              title="Unable to load recent tickets"
              description="The ticket API request failed."
              onRetry={onRetry}
            />
          </div>
        ) : state !== "ready" || !tickets ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={Inbox}
              title="Recent tickets unavailable"
              description="No usable ticket list was returned by the API."
            />
          </div>
        ) : tickets.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={TicketIcon}
              title="No tickets to show"
              description="Recently updated tickets will appear here."
            />
          </div>
        ) : (
          <div>
            {tickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/tickets/${ticket.id}`}
                className="grid gap-3 border-t px-5 py-4 transition-colors hover:bg-muted/30 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-xs font-medium text-muted-foreground">
                      {ticket.ticketNumber}
                    </span>
                    <Badge variant={statusVariants[ticket.status]}>
                      {statusLabels[ticket.status]}
                    </Badge>
                    <Badge variant={priorityVariants[ticket.priority]}>
                      {getPriorityLabel(ticket.priority)}
                    </Badge>
                  </div>
                  <p className="mt-1 truncate text-sm font-medium">
                    {ticket.title}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {ticket.assignee?.name
                      ? `Assigned to ${ticket.assignee.name}`
                      : "Unassigned"}
                  </p>
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {formatDate(ticket.updatedAt)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function OperationalDashboard() {
  const organizationsQuery = useOrganizations();
  const membership = organizationsQuery.data?.[0];
  const organizationId = membership?.organizationId;
  const roleScope = membership ?? { role: "REQUESTER" as const, userId: "" };
  const trendWindow = useMemo(() => createTicketTrendWindow(), []);

  const openQuery = useAnalyticsDashboard(
    organizationId,
    buildRoleScopedAnalyticsParams(roleScope, { status: "OPEN" }),
    { refetchInterval: REFRESH_INTERVAL_MS },
  );
  const inProgressQuery = useAnalyticsDashboard(
    organizationId,
    buildRoleScopedAnalyticsParams(roleScope, { status: "IN_PROGRESS" }),
    { refetchInterval: REFRESH_INTERVAL_MS },
  );
  const pendingQuery = useAnalyticsDashboard(
    organizationId,
    buildRoleScopedAnalyticsParams(roleScope, { status: "PENDING" }),
    { refetchInterval: REFRESH_INTERVAL_MS },
  );
  const allTicketsQuery = useAnalyticsDashboard(
    organizationId,
    buildRoleScopedAnalyticsParams(roleScope),
    { refetchInterval: REFRESH_INTERVAL_MS },
  );
  const trendQuery = useAnalyticsDashboard(
    organizationId,
    buildRoleScopedAnalyticsParams(roleScope, {
      from: trendWindow.from,
      to: trendWindow.to,
      dateField: "createdAt",
    }),
    { refetchInterval: REFRESH_INTERVAL_MS },
  );
  const ticketsQuery = useTickets(
    organizationId,
    buildRoleScopedTicketParams(roleScope, {
      page: 1,
      limit: 6,
      sortBy: "updatedAt",
      sortOrder: "desc",
    }),
    { refetchInterval: REFRESH_INTERVAL_MS },
  );

  const workloadQueries = [openQuery, inProgressQuery, pendingQuery];
  const workloadState = dashboardDataState({
    isLoading: workloadQueries.some((query) => query.isLoading),
    isError: workloadQueries.some((query) => query.isError),
    data: workloadQueries.every((query) => query.data !== undefined)
      ? true
      : undefined,
  });
  const workloadResponses =
    openQuery.data && inProgressQuery.data && pendingQuery.data
      ? {
          OPEN: openQuery.data,
          IN_PROGRESS: inProgressQuery.data,
          PENDING: pendingQuery.data,
        }
      : undefined;
  const workload =
    workloadState === "ready" && workloadResponses
      ? aggregateActiveWorkload(workloadResponses)
      : undefined;

  const openState = dashboardDataState({
    isLoading: openQuery.isLoading,
    isError: openQuery.isError,
    data: openQuery.data,
  });
  const inProgressState = dashboardDataState({
    isLoading: inProgressQuery.isLoading,
    isError: inProgressQuery.isError,
    data: inProgressQuery.data,
  });
  const allTicketsState = dashboardDataState({
    isLoading: allTicketsQuery.isLoading,
    isError: allTicketsQuery.isError,
    data: allTicketsQuery.data,
  });
  const trendState = dashboardDataState({
    isLoading: trendQuery.isLoading,
    isError: trendQuery.isError,
    data: trendQuery.data,
  });
  const ticketsState = dashboardDataState({
    isLoading: ticketsQuery.isLoading,
    isError: ticketsQuery.isError,
    data: ticketsQuery.data,
  });

  const normalizedTrend = useMemo(
    () =>
      normalizeVolumeTrend(
        trendQuery.data?.data.volumeTrend ?? [],
        trendWindow.fromDate,
        trendWindow.toDate,
      ),
    [
      trendQuery.data?.data.volumeTrend,
      trendWindow.fromDate,
      trendWindow.toDate,
    ],
  );
  const weeklyComparison = useMemo(
    () => compareWeeklyTicketVolume(normalizedTrend, trendWindow.today),
    [normalizedTrend, trendWindow.today],
  );
  const trendSeriesMatchesTotal =
    trendQuery.data !== undefined &&
    normalizedTrend.reduce((sum, point) => sum + point.count, 0) ===
      trendQuery.data.data.metrics.total;
  const trendMetricState: DashboardDataState =
    trendState === "ready" && !trendSeriesMatchesTotal ? "error" : trendState;

  const retryWorkload = () => {
    void Promise.all(workloadQueries.map((query) => query.refetch()));
  };
  const retryTrend = () => void trendQuery.refetch();
  const retryTickets = () => void ticketsQuery.refetch();
  const retryAllTickets = () => void allTicketsQuery.refetch();

  if (organizationsQuery.isLoading) {
    return <LoadingState label="Loading workspace…" />;
  }
  if (organizationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load workspace"
        description="We could not determine your active organization."
        onRetry={() => void organizationsQuery.refetch()}
      />
    );
  }
  if (!membership || !organizationId) {
    return (
      <EmptyState
        icon={Inbox}
        title="No organization available"
        description="Your account is not associated with an organization."
      />
    );
  }

  const newTicketsThisWeek =
    trendMetricState === "ready" ? weeklyComparison.currentTotal : undefined;
  const weeklyComparisonText =
    trendMetricState === "ready"
      ? formatWeeklyComparison(weeklyComparison)
      : undefined;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Live workload, SLA attention, and shortcuts for daily support operations."
        actions={
          <Link
            href="/tickets/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <TicketIcon className="size-4" aria-hidden="true" />
            Raise Ticket
          </Link>
        }
      />

      <section
        aria-label="Current operational metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:gap-5"
      >
        <MetricCard
          title="Open Tickets"
          icon={Inbox}
          state={openState}
          value={openQuery.data?.data.metrics.total}
          description={
            openQuery.data?.data.metrics.total === 0
              ? "No tickets in the open state"
              : "Currently open and awaiting work"
          }
          onRetry={() => void openQuery.refetch()}
        />
        <MetricCard
          title="In Progress"
          icon={Clock3}
          state={inProgressState}
          value={inProgressQuery.data?.data.metrics.total}
          description={
            inProgressQuery.data?.data.metrics.total === 0
              ? "No tickets being actively worked"
              : "Tickets currently being worked"
          }
          onRetry={() => void inProgressQuery.refetch()}
        />
        <MetricCard
          title="Resolved / Closed"
          icon={CheckCircle2}
          state={allTicketsState}
          value={allTicketsQuery.data?.data.metrics.resolvedClosed}
          description={
            allTicketsQuery.data?.data.metrics.resolvedClosed === 0
              ? "No tickets resolved or closed"
              : "Tickets in a completed state"
          }
          onRetry={retryAllTickets}
        />
        <MetricCard
          title="SLA Breaches"
          icon={AlertTriangle}
          state={workloadState}
          value={workload?.activeSlaBreaches}
          description={
            workload?.activeSlaBreaches === 0
              ? "No active tickets with a recorded SLA breach"
              : "Active tickets with a recorded first-response or resolution breach"
          }
          onRetry={retryWorkload}
        />
        <MetricCard
          title="Unassigned Active"
          icon={UserX}
          state={workloadState}
          value={workload?.unassignedActiveTickets}
          description={
            workload?.unassignedActiveTickets === 0
              ? "All active tickets have an assignee"
              : "Open, in-progress, or pending tickets without an assignee"
          }
          onRetry={retryWorkload}
        />
        <MetricCard
          title="New Tickets (7 days)"
          icon={CheckCircle2}
          state={trendMetricState}
          value={newTicketsThisWeek}
          description="Created in the last 7 complete UTC days"
          comparison={weeklyComparisonText}
          onRetry={retryTrend}
        />
      </section>

      <section aria-label="Quick actions" className="space-y-4">
        <div>
          <h2 className="text-base font-semibold">Quick Actions</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Jump directly to the work that needs attention.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {quickActions.map((item) => (
            <QuickAction item={item} key={item.title} />
          ))}
        </div>
      </section>

      <section className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1.5fr)_minmax(360px,1fr)]">
        <TicketTrends
          state={trendState}
          points={normalizedTrend}
          ticketCount={trendQuery.data?.data.metrics.total}
          onRetry={retryTrend}
        />
        <PriorityDistribution
          points={workload?.priorityDistribution}
          state={workloadState}
          onRetry={retryWorkload}
        />
      </section>

      <RecentTickets
        state={ticketsState}
        tickets={ticketsQuery.data?.data}
        onRetry={retryTickets}
      />

      <p className="text-xs text-muted-foreground">
        Operational data refreshes automatically every 30 seconds. Historical
        filtering, detailed comparisons, and exports remain under Reports.
      </p>
    </div>
  );
}
