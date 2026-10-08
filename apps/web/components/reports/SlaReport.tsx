"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Timer,
  Users,
  UserX,
  XCircle,
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

import { SlaBreachAnalysis } from "@/components/reports/SlaBreachAnalysis";

import { useOrganizations } from "@/hooks/use-organizations";
import { useSlaReport } from "@/hooks/use-sla-report";

import type {
  SlaReportMetric,
  SlaReportPriorityPoint,
  SlaReportTeamPoint,
  SlaReportAssigneePoint,
  SlaReportTrendPoint,
} from "@/types/sla-report";

function formatRate(rate: number | null) {
  return rate === null ? "—" : `${rate.toFixed(1)}%`;
}

function getDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function SlaReport() {
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

  const reportQuery = useSlaReport(organizationId, {
    from: from ? `${from}T00:00:00.000Z` : undefined,

    to: to ? `${to}T23:59:59.999Z` : undefined,
  });

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
        icon={UserX}
        title="No organization available"
        description="Your account is not associated with an organization."
      />
    );
  }

  if (reportQuery.isLoading) {
    return <LoadingState label="Loading SLA report..." />;
  }

  if (reportQuery.isError) {
    return (
      <ErrorState
        title="Unable to load SLA report"
        description={
          reportQuery.error instanceof Error
            ? reportQuery.error.message
            : "We couldn't load SLA reporting data."
        }
        onRetry={() => reportQuery.refetch()}
      />
    );
  }

  const result = reportQuery.data;

  if (!result) {
    return <LoadingState />;
  }

  const {
    summary,
    comparison,
    trend,
    byPriority,
    byTeam,
    byAssignee,
    breachAnalysis,
  } = result.data;

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header / filters                                                   */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">SLA Reports</h1>

          <p className="mt-1 text-sm text-muted-foreground">
            Analyze SLA compliance, breaches, at-risk tickets, first-response
            performance, and resolution performance.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div>
            <label
              htmlFor="sla-report-from"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              From
            </label>

            <Input
              id="sla-report-from"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="sla-report-to"
              className="mb-1 block text-xs font-medium text-muted-foreground"
            >
              To
            </label>

            <Input
              id="sla-report-to"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 7-E.2 — Summary                                                     */}
      {/* ------------------------------------------------------------------ */}

      <section
        aria-label="SLA overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <StatCard
          title="SLA Tracked"
          value={summary.totalTracked}
          description="Tickets with SLA snapshots"
          icon={Timer}
        />

        <StatCard
          title="Breached"
          value={summary.breached}
          description="First response or resolution"
          icon={XCircle}
        />

        <StatCard
          title="At Risk"
          value={summary.atRisk}
          description="Inside SLA warning window"
          icon={AlertTriangle}
        />

        <StatCard
          title="Active"
          value={summary.active}
          description="Running without breach"
          icon={Clock3}
        />

        <StatCard
          title="Resolved"
          value={summary.resolved}
          description="Tickets with resolution"
          icon={CheckCircle2}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 7-E.2 / 7-E.7 — First Response vs Resolution                       */}
      {/* ------------------------------------------------------------------ */}

      <section className="grid gap-6 lg:grid-cols-2">
        <SlaMetricCard
          title="First-response SLA"
          icon={Clock3}
          metric={summary.firstResponse}
        />

        <SlaMetricCard
          title="Resolution SLA"
          icon={Timer}
          metric={summary.resolution}
        />
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* 7-E.7 — Comparison                                                  */}
      {/* ------------------------------------------------------------------ */}

      <Card>
        <CardHeader>
          <CardTitle>First Response vs Resolution</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            <ComparisonMetric
              title="First response"
              completed={comparison.firstResponse.completed}
              compliant={comparison.firstResponse.compliant}
              breached={comparison.firstResponse.breached}
              complianceRate={comparison.firstResponse.complianceRate}
              breachRate={comparison.firstResponse.breachRate}
            />

            <ComparisonMetric
              title="Resolution"
              completed={comparison.resolution.completed}
              compliant={comparison.resolution.compliant}
              breached={comparison.resolution.breached}
              complianceRate={comparison.resolution.complianceRate}
              breachRate={comparison.resolution.breachRate}
            />
          </div>

          <div className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2">
            <Metric
              label="Compliance gap"
              value={formatPercentagePoints(
                comparison.complianceGapPercentagePoints,
              )}
            />

            <Metric
              label="Breach-rate gap"
              value={formatPercentagePoints(
                comparison.breachGapPercentagePoints,
              )}
            />
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* 7-E.3 — SLA Trend                                                   */}
      {/* ------------------------------------------------------------------ */}

      <SlaTrendCard trend={trend} />

      {/* ------------------------------------------------------------------ */}
      {/* 7-E.4 — SLA by Priority                                             */}
      {/* ------------------------------------------------------------------ */}

      <SlaPriorityCard points={byPriority} />

      {/* ------------------------------------------------------------------ */}
      {/* 7-E.5 — SLA by Team                                                 */}
      {/* ------------------------------------------------------------------ */}

      <SlaDimensionCard title="SLA by Team" icon={Users} points={byTeam} />

      {/* ------------------------------------------------------------------ */}
      {/* 7-E.6 — SLA by Assignee                                             */}
      {/* ------------------------------------------------------------------ */}

      <SlaDimensionCard
        title="SLA by Assignee"
        icon={Users}
        points={byAssignee}
      />

      {/* ------------------------------------------------------------------ */}
      {/* 7-E.8 — Breach Analysis                                             */}
      {/* ------------------------------------------------------------------ */}

      <SlaBreachAnalysis analysis={breachAnalysis} />
    </div>
  );
}

/* ========================================================================== */
/* Shared components                                                          */
/* ========================================================================== */

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>

      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
}

function formatPercentagePoints(value: number | null) {
  if (value === null) {
    return "—";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)} pp`;
}

function SlaMetricCard({
  title,
  icon: Icon,
  metric,
}: {
  title: string;
  icon: typeof Clock3;
  metric: SlaReportMetric;
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
        <div className="grid gap-6 sm:grid-cols-4">
          <Metric
            label="Compliance"
            value={formatRate(metric.complianceRate)}
          />

          <Metric label="Completed" value={String(metric.completed)} />

          <Metric label="Compliant" value={String(metric.compliant)} />

          <Metric label="Breached" value={String(metric.breached)} />
        </div>
      </CardContent>
    </Card>
  );
}

function ComparisonMetric({
  title,
  completed,
  compliant,
  breached,
  complianceRate,
  breachRate,
}: {
  title: string;
  completed: number;
  compliant: number;
  breached: number;
  complianceRate: number | null;
  breachRate: number | null;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="font-medium">{title}</p>

        <span className="text-xl font-semibold">
          {formatRate(complianceRate)}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Metric label="Completed" value={String(completed)} />

        <Metric label="Compliant" value={String(compliant)} />

        <Metric label="Breached" value={String(breached)} />
      </div>

      <div className="mt-4 border-t pt-4">
        <Metric label="Breach rate" value={formatRate(breachRate)} />
      </div>
    </div>
  );
}

/* ========================================================================== */
/* 7-E.3 — Trend                                                             */
/* ========================================================================== */

function SlaTrendCard({ trend }: { trend: SlaReportTrendPoint[] }) {
  if (trend.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA Trend</CardTitle>
        </CardHeader>

        <CardContent>
          <EmptyState
            icon={BarChart3}
            title="No SLA trend data"
            description="There are no SLA records in the selected date range."
          />
        </CardContent>
      </Card>
    );
  }

  const width = 900;
  const height = 320;

  const padding = {
    top: 24,
    right: 24,
    bottom: 52,
    left: 48,
  };

  const chartWidth = width - padding.left - padding.right;

  const chartHeight = height - padding.top - padding.bottom;

  const maximum = Math.max(...trend.map((point) => point.tracked), 1);

  const getX = (index: number) => {
    if (trend.length === 1) {
      return padding.left + chartWidth / 2;
    }

    return padding.left + (index / (trend.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / maximum) * chartHeight;
  };

  const buildPath = (selector: (point: SlaReportTrendPoint) => number) =>
    trend
      .map((point, index) => {
        const command = index === 0 ? "M" : "L";

        return `${command} ${getX(index)} ${getY(selector(point))}`;
      })
      .join(" ");

  const trackedPath = buildPath((point) => point.tracked);

  const breachedPath = buildPath((point) => point.breached);

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(new Date(value));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>SLA Trend</CardTitle>

          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary" />
              Tracked
            </span>

            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-red-500" />
              Breached
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="h-auto min-w-[650px] w-full"
            role="img"
            aria-label="SLA ticket trend"
          >
            <path
              d={trackedPath}
              fill="none"
              className="stroke-primary"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            <path
              d={breachedPath}
              fill="none"
              className="stroke-red-500"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {trend.map((point, index) => {
              const x = getX(index);

              return (
                <g key={point.date}>
                  <title>
                    {formatDate(point.date)} — {point.tracked} tracked,{" "}
                    {point.breached} breached, {formatRate(point.breachRate)}
                  </title>

                  <circle
                    cx={x}
                    cy={getY(point.tracked)}
                    r="3"
                    className="fill-primary"
                  />

                  <circle
                    cx={x}
                    cy={getY(point.breached)}
                    r="3"
                    className="fill-red-500"
                  />

                  {(index === 0 ||
                    index === trend.length - 1 ||
                    trend.length <= 7 ||
                    index % Math.ceil(trend.length / 6) === 0) && (
                    <text
                      x={x}
                      y={height - 16}
                      textAnchor="middle"
                      className="fill-muted-foreground text-[11px]"
                    >
                      {formatDate(point.date)}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/* 7-E.4 — Priority                                                          */
/* ========================================================================== */

function SlaPriorityCard({ points }: { points: SlaReportPriorityPoint[] }) {
  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>SLA by Priority</CardTitle>
        </CardHeader>

        <CardContent>
          <EmptyState
            icon={AlertTriangle}
            title="No priority data"
            description="No SLA records match the selected period."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-muted-foreground" />

          <CardTitle>SLA by Priority</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-3 font-medium">Priority</th>

                <th className="px-3 py-3 text-right font-medium">Tracked</th>

                <th className="px-3 py-3 text-right font-medium">Breached</th>

                <th className="px-3 py-3 text-right font-medium">
                  Breach Rate
                </th>

                <th className="px-3 py-3 text-right font-medium">At Risk</th>

                <th className="px-3 py-3 text-right font-medium">Compliance</th>
              </tr>
            </thead>

            <tbody>
              {points.map((point) => (
                <tr key={point.key} className="border-b last:border-0">
                  <td className="px-3 py-3 font-medium">{point.label}</td>

                  <td className="px-3 py-3 text-right">{point.tracked}</td>

                  <td className="px-3 py-3 text-right text-red-600">
                    {point.breached}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {formatRate(point.breachRate)}
                  </td>

                  <td className="px-3 py-3 text-right text-amber-600">
                    {point.atRisk}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {formatRate(point.firstResponse.complianceRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/* ========================================================================== */
/* 7-E.5 / 7-E.6 — Team / Assignee                                          */
/* ========================================================================== */

function SlaDimensionCard({
  title,
  icon: Icon,
  points,
}: {
  title: string;
  icon: typeof Users;
  points: SlaReportTeamPoint[] | SlaReportAssigneePoint[];
}) {
  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" />

            <CardTitle>{title}</CardTitle>
          </div>
        </CardHeader>

        <CardContent>
          <EmptyState
            icon={Users}
            title="No data"
            description="No SLA records match the selected period."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />

          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="px-3 py-3 font-medium">Name</th>

                <th className="px-3 py-3 text-right font-medium">Tracked</th>

                <th className="px-3 py-3 text-right font-medium">Breached</th>

                <th className="px-3 py-3 text-right font-medium">
                  Breach Rate
                </th>

                <th className="px-3 py-3 text-right font-medium">At Risk</th>

                <th className="px-3 py-3 text-right font-medium">Resolution</th>
              </tr>
            </thead>

            <tbody>
              {points.map((point) => (
                <tr key={point.key} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <span className="font-medium">{point.label}</span>
                  </td>

                  <td className="px-3 py-3 text-right">{point.tracked}</td>

                  <td className="px-3 py-3 text-right text-red-600">
                    {point.breached}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {formatRate(point.breachRate)}
                  </td>

                  <td className="px-3 py-3 text-right text-amber-600">
                    {point.atRisk}
                  </td>

                  <td className="px-3 py-3 text-right">
                    {formatRate(point.resolution.complianceRate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
