"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Inbox,
  TicketCheck,
  Users,
  UserX,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
} from "@/components/shared";

import { useOrganizations } from "@/hooks/use-organizations";
import { useAnalyticsDashboard } from "@/hooks/use-analytics-dashboard";

function formatRate(rate: number | null) {
  return rate === null ? "—" : `${rate.toFixed(1)}%`;
}

function formatMinutes(minutes: number | null) {
  if (minutes === null) {
    return "—";
  }

  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }

  const hours = minutes / 60;

  if (hours < 24) {
    return `${hours.toFixed(1)}h`;
  }

  return `${(hours / 24).toFixed(1)}d`;
}

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function AnalyticsDashboard() {
  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const defaultDates = useMemo(() => {
    const to = new Date();
    const from = new Date(to);

    from.setDate(from.getDate() - 29);

    return {
      from: getDateString(from),
      to: getDateString(to),
    };
  }, []);

  const [from, setFrom] = useState(defaultDates.from);
  const [to, setTo] = useState(defaultDates.to);

  const dashboardQuery = useAnalyticsDashboard(organizationId, {
    from: from ? `${from}T00:00:00.000Z` : undefined,
    to: to ? `${to}T23:59:59.999Z` : undefined,
  });

  /*
   * Hooks must run before any conditional return.
   *
   * The API intentionally returns a sparse volume series. Normalize it
   * here so the chart receives one point for every day in the selected
   * date range, with zeroes for days without tickets.
   */
  const normalizedVolumeTrend = useMemo(
    () =>
      normalizeVolumeTrend(
        dashboardQuery.data?.data.volumeTrend ?? [],
        from,
        to,
      ),
    [dashboardQuery.data?.data.volumeTrend, from, to],
  );

  if (organizationsQuery.isLoading) {
    return <LoadingState label="Loading workspace..." />;
  }

  if (organizationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load workspace"
        description="We couldn't determine your current organization."
        onRetry={() => organizationsQuery.refetch()}
      />
    );
  }

  if (!organizationId) {
    return (
      <EmptyState
        icon={Inbox}
        title="No organization available"
        description="Your account is not associated with an organization."
      />
    );
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState label="Loading analytics dashboard..." />;
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        title="Unable to load analytics"
        description={
          dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : "We couldn't load analytics."
        }
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  }

  const result = dashboardQuery.data;

  if (!result) {
    return <LoadingState />;
  }

  const metrics = result.data.metrics;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Monitor ticket volume, workload, SLA performance, and resolution
            trends.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div>
            <label
              htmlFor="analytics-from"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              From
            </label>

            <Input
              id="analytics-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="analytics-to"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              To
            </label>

            <Input
              id="analytics-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
      </div>

      <section
        aria-label="Analytics overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="Total Tickets"
          value={metrics.total}
          description="Tickets in selected period"
          icon={BarChart3}
        />

        <StatCard
          title="Open / Active"
          value={metrics.active}
          description="Open, in progress, or pending"
          icon={Clock3}
        />

        <StatCard
          title="Resolved / Closed"
          value={metrics.resolvedClosed}
          description="Completed ticket lifecycle"
          icon={TicketCheck}
        />

        <StatCard
          title="Unassigned"
          value={metrics.unassigned}
          description="Tickets without an assignee"
          icon={UserX}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SLA Performance</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <Metric
                label="Overall compliance"
                value={formatRate(metrics.sla.complianceRate)}
              />

              <Metric
                label="First response"
                value={formatRate(metrics.sla.firstResponse.complianceRate)}
              />

              <Metric
                label="Resolution"
                value={formatRate(metrics.sla.resolution.complianceRate)}
              />
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600" />

                  <span className="text-sm font-medium">SLA compliant</span>
                </div>

                <p className="mt-2 text-2xl font-semibold">
                  {metrics.sla.compliant}
                </p>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-red-600" />

                  <span className="text-sm font-medium">SLA breached</span>
                </div>

                <p className="mt-2 text-2xl font-semibold">
                  {metrics.sla.breached}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolution / TAT</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 sm:grid-cols-3">
              <Metric label="Resolved" value={String(metrics.tat.resolved)} />

              <Metric
                label="Average TAT"
                value={formatMinutes(metrics.tat.averageResolutionMinutes)}
              />

              <Metric
                label="Median TAT"
                value={formatMinutes(metrics.tat.medianResolutionMinutes)}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Ticket Volume</CardTitle>
        </CardHeader>

        <CardContent>
          {normalizedVolumeTrend.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No ticket activity"
              description="There are no tickets in the selected date range."
            />
          ) : (
            <VolumeChart points={normalizedVolumeTrend} />
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 lg:grid-cols-2">
        <DistributionCard
          title="Priority Distribution"
          icon={AlertTriangle}
          points={result.data.priorityDistribution}
        />

        <WorkloadCard
          title="Team Workload"
          icon={Users}
          points={result.data.teamWorkload}
        />
      </section>

      <WorkloadCard
        title="Assignee Workload"
        icon={Users}
        points={result.data.assigneeWorkload}
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function normalizeVolumeTrend(
  points: Array<{ date: string; count: number }>,
  from: string | undefined,
  to: string | undefined,
) {
  if (!from || !to) {
    return points;
  }

  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end
  ) {
    return points;
  }

  const counts = new Map<string, number>();

  for (const point of points) {
    const date = new Date(point.date);

    if (Number.isNaN(date.getTime())) {
      continue;
    }

    const key = date.toISOString().slice(0, 10);

    counts.set(key, (counts.get(key) ?? 0) + point.count);
  }

  const normalized: Array<{
    date: string;
    count: number;
  }> = [];

  const current = new Date(start);

  while (current <= end) {
    const key = current.toISOString().slice(0, 10);

    normalized.push({
      date: `${key}T00:00:00.000Z`,
      count: counts.get(key) ?? 0,
    });

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return normalized;
}

function VolumeChart({
  points,
}: {
  points: Array<{ date: string; count: number }>;
}) {
  const width = 900;
  const height = 280;

  const padding = {
    top: 24,
    right: 24,
    bottom: 48,
    left: 48,
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maximum = Math.max(...points.map((point) => point.count), 1);

  const yAxisSteps = Math.min(Math.max(maximum, 1), 5);

  const getX = (index: number) => {
    if (points.length === 1) {
      return padding.left + chartWidth / 2;
    }

    return padding.left + (index / (points.length - 1)) * chartWidth;
  };

  const formatShortDate = (date: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(date));
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    <div className="w-full">
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto min-w-[600px] w-full"
          role="img"
          aria-label="Ticket volume over time"
        >
          {/* Y-axis grid */}
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

          {/* X-axis */}
          <line
            x1={padding.left}
            y1={padding.top + chartHeight}
            x2={width - padding.right}
            y2={padding.top + chartHeight}
            className="stroke-border"
            strokeWidth="1"
          />

          {/* Volume bars */}
          {points.map((point, index) => {
            const x = getX(index);

            const barWidth =
              points.length === 1
                ? 80
                : Math.max(
                    12,
                    Math.min(48, (chartWidth / points.length) * 0.65),
                  );

            const barHeight = Math.max(
              4,
              (point.count / maximum) * chartHeight,
            );

            const y = padding.top + chartHeight - barHeight;

            return (
              <g key={point.date}>
                <title>
                  {formatShortDate(point.date)}: {point.count}{" "}
                  {point.count === 1 ? "ticket" : "tickets"}
                </title>

                <rect
                  x={x - barWidth / 2}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  className="fill-primary/70 transition-opacity hover:opacity-80"
                />

                {/* Value above bar */}
                <text
                  x={x}
                  y={y - 8}
                  textAnchor="middle"
                  className="fill-foreground text-[11px] font-medium"
                >
                  {point.count}
                </text>

                {/* Date label */}
                {(index === 0 ||
                  index === points.length - 1 ||
                  points.length <= 7 ||
                  index % Math.ceil(points.length / 6) === 0) && (
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
    </div>
  );
}

function DistributionCard({
  title,
  icon: Icon,
  points,
}: {
  title: string;
  icon: typeof AlertTriangle;
  points: Array<{
    key: string;
    label: string;
    count: number;
    percentage: number;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />

          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {points.length === 0 ? (
          <EmptyState
            icon={BarChart3}
            title="No data"
            description="No tickets match the selected period."
          />
        ) : (
          <div className="space-y-4">
            {points.map((point) => (
              <div key={point.key}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>{point.label}</span>

                  <span className="text-muted-foreground">
                    {point.count} · {point.percentage}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${point.percentage}%`,
                    }}
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

function WorkloadCard({
  title,
  icon: Icon,
  points,
}: {
  title: string;
  icon: typeof Users;
  points: Array<{
    id: string | null;
    name: string;
    count: number;
  }>;
}) {
  const maximum = Math.max(...points.map((point) => point.count), 1);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />

          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        {points.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No workload data"
            description="No matching workload exists in the selected period."
          />
        ) : (
          <div className="space-y-4">
            {points.map((point) => (
              <div key={point.id ?? point.name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="truncate">{point.name}</span>

                  <span className="ml-4 shrink-0 text-muted-foreground">
                    {point.count}
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${(point.count / maximum) * 100}%`,
                    }}
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
