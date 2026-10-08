"use client";

import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ExternalLink,
  ShieldAlert,
  Timer,
  Users,
  UserX,
  XCircle,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

import { EmptyState } from "@/components/shared";
import { useRouter } from "next/navigation";

import type {
  SlaBreachAnalysis as SlaBreachAnalysisData,
  SlaBreachNamedDimensionPoint,
  SlaBreachPriorityPoint,
  SlaBreachTrendPoint,
} from "@/types/sla-report";

export interface SlaBreachAnalysisProps {
  analysis: SlaBreachAnalysisData;
}

export function getBreachRate({
  tracked,

  breached,
}: {
  tracked: number;

  breached: number;
}): number {
  if (tracked === 0) {
    return 0;
  }

  return Number(((breached / tracked) * 100).toFixed(2));
}

export function getAtRiskRate({
  tracked,

  atRisk,
}: {
  tracked: number;

  atRisk: number;
}): number {
  if (tracked === 0) {
    return 0;
  }

  return Number(((atRisk / tracked) * 100).toFixed(2));
}

export function buildSlaDrillDownUrl(
  view:
    | "BREACHED"
    | "AT_RISK"
    | "FIRST_RESPONSE_BREACHED"
    | "RESOLUTION_BREACHED",
): string {
  return `/reports/sla?view=${view}`;
}

function formatRate(rate: number): string {
  return `${rate.toFixed(1)}%`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",

    day: "numeric",
  }).format(new Date(value));
}

function formatDimensionLabel(label: string): string {
  return label

    .replaceAll("_", " ")

    .toLowerCase()

    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function MetricCard({
  title,

  value,

  description,

  icon: Icon,

  variant = "default",
}: {
  title: string;

  value: string;

  description: string;

  icon: typeof Timer;

  variant?: "default" | "danger" | "warning" | "success";
}) {
  const iconClassName =
    variant === "danger"
      ? "text-red-600"
      : variant === "warning"
        ? "text-amber-600"
        : variant === "success"
          ? "text-emerald-600"
          : "text-muted-foreground";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>

            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {value}
            </p>

            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>

          <Icon className={`size-5 ${iconClassName}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function DimensionTable({
  title,

  icon: Icon,

  points,
}: {
  title: string;

  icon: typeof Users;

  points: Array<SlaBreachPriorityPoint | SlaBreachNamedDimensionPoint>;
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
            icon={Icon}
            title="No data"
            description="No SLA tickets match the selected report filters."
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
                <th className="px-3 py-3 font-medium">Dimension</th>

                <th className="px-3 py-3 text-right font-medium">Tracked</th>

                <th className="px-3 py-3 text-right font-medium">Breached</th>

                <th className="px-3 py-3 text-right font-medium">
                  Breach Rate
                </th>

                <th className="px-3 py-3 text-right font-medium">At Risk</th>

                <th className="px-3 py-3 text-right font-medium">
                  At-Risk Rate
                </th>
              </tr>
            </thead>

            <tbody>
              {points.map((point) => (
                <tr key={point.key} className="border-b last:border-0">
                  <td className="px-3 py-3">
                    <span className="font-medium">
                      {point.label === "Unassigned"
                        ? point.label
                        : formatDimensionLabel(point.label)}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-right">{point.tracked}</td>

                  <td className="px-3 py-3 text-right">
                    <span className="font-medium text-red-600">
                      {point.breached}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-right">
                    <Badge
                      variant={
                        point.breachRate >= 50
                          ? "danger"
                          : point.breachRate > 0
                            ? "warning"
                            : "success"
                      }
                    >
                      {formatRate(point.breachRate)}
                    </Badge>
                  </td>

                  <td className="px-3 py-3 text-right">
                    <span className="font-medium text-amber-600">
                      {point.atRisk}
                    </span>
                  </td>

                  <td className="px-3 py-3 text-right">
                    {formatRate(point.atRiskRate)}
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

function BreachTrend({ points }: { points: SlaBreachTrendPoint[] }) {
  if (points.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Breach Trend</CardTitle>
        </CardHeader>

        <CardContent>
          <EmptyState
            icon={ShieldAlert}
            title="No breach activity"
            description="No SLA trend data exists for the selected period."
          />
        </CardContent>
      </Card>
    );
  }

  const width = 900;

  const height = 300;

  const padding = {
    top: 24,

    right: 24,

    bottom: 52,

    left: 48,
  };

  const chartWidth = width - padding.left - padding.right;

  const chartHeight = height - padding.top - padding.bottom;

  const maximum = Math.max(
    ...points.flatMap((point) => [point.tracked, point.breached, point.atRisk]),

    1,
  );

  const getX = (index: number) => {
    if (points.length === 1) {
      return padding.left + chartWidth / 2;
    }

    return padding.left + (index / (points.length - 1)) * chartWidth;
  };

  const getY = (value: number) => {
    return padding.top + chartHeight - (value / maximum) * chartHeight;
  };

  const buildPath = (selector: (point: SlaBreachTrendPoint) => number) =>
    points

      .map((point, index) => {
        const command = index === 0 ? "M" : "L";

        return `${command} ${getX(index)} ${getY(selector(point))}`;
      })

      .join(" ");

  const trackedPath = buildPath((point) => point.tracked);

  const breachedPath = buildPath((point) => point.breached);

  const atRiskPath = buildPath((point) => point.atRisk);

  const ySteps = Math.min(Math.max(maximum, 1), 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Breach Trend</CardTitle>

          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-primary" />
              Tracked
            </span>

            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-red-500" />
              Breached
            </span>

            <span className="flex items-center gap-1">
              <span className="size-2 rounded-full bg-amber-500" />
              At Risk
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
            aria-label="SLA breach and at-risk trend"
          >
            {Array.from({ length: ySteps + 1 }).map((_, index) => {
              const value = maximum - (index / ySteps) * maximum;

              const y = padding.top + (index / ySteps) * chartHeight;

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
                    {Math.round(value)}
                  </text>
                </g>
              );
            })}

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

            <path
              d={atRiskPath}
              fill="none"
              className="stroke-amber-500"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {points.map((point, index) => {
              const x = getX(index);

              return (
                <g key={point.date}>
                  <title>
                    {formatDate(point.date)} — Tracked: {point.tracked},
                    Breached: {point.breached}, At Risk: {point.atRisk}
                  </title>

                  <circle
                    cx={x}
                    cy={getY(point.breached)}
                    r="3"
                    className="fill-red-500"
                  />

                  <circle
                    cx={x}
                    cy={getY(point.atRisk)}
                    r="3"
                    className="fill-amber-500"
                  />

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

function PerformanceBreakdown({
  analysis,
}: {
  analysis: SlaBreachAnalysisData;
}) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>First-response Breaches</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Breached</p>

              <p className="mt-1 text-2xl font-semibold">
                {analysis.firstResponse.breached}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Breach rate</p>

              <p className="mt-1 text-2xl font-semibold">
                {formatRate(analysis.firstResponse.breachRate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resolution Breaches</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground">Breached</p>

              <p className="mt-1 text-2xl font-semibold">
                {analysis.resolution.breached}
              </p>
            </div>

            <div>
              <p className="text-xs text-muted-foreground">Breach rate</p>

              <p className="mt-1 text-2xl font-semibold">
                {formatRate(analysis.resolution.breachRate)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function DrillDownActions({ analysis }: { analysis: SlaBreachAnalysisData }) {
  const router = useRouter();

  const actions = [
    {
      href: analysis.drillDown.allBreached,
      label: "View Breached Tickets",
      icon: XCircle,
      variant: "default" as const,
    },
    {
      href: analysis.drillDown.atRisk,
      label: "View At-Risk Tickets",
      icon: AlertTriangle,
      variant: "outline" as const,
    },
    {
      href: analysis.drillDown.firstResponseBreached,
      label: "First-response Breaches",
      icon: Clock3,
      variant: "outline" as const,
    },
    {
      href: analysis.drillDown.resolutionBreached,
      label: "Resolution Breaches",
      icon: Timer,
      variant: "outline" as const,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>SLA Performance Drill-down</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap gap-3">
          {actions.map(({ href, label, icon: Icon, variant }) => (
            <Button
              key={href}
              type="button"
              variant={variant}
              onClick={() => router.push(href)}
            >
              <Icon className="mr-2 size-4" />
              {label}
              <ExternalLink className="ml-2 size-3.5" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function SlaBreachAnalysis({ analysis }: SlaBreachAnalysisProps) {
  const { summary, trend, dimensions } = analysis;

  return (
    <div className="space-y-6">
      <section
        aria-label="SLA breach overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          title="SLA Tracked"
          value={String(summary.tracked)}
          description="Tickets with SLA snapshots"
          icon={Timer}
        />

        <MetricCard
          title="Breached"
          value={String(summary.breached)}
          description={`${formatRate(summary.breachRate)} breach rate`}
          icon={XCircle}
          variant="danger"
        />

        <MetricCard
          title="At Risk"
          value={String(summary.atRisk)}
          description={`${formatRate(summary.atRiskRate)} of tracked tickets`}
          icon={AlertTriangle}
          variant="warning"
        />

        <MetricCard
          title="Within SLA"
          value={String(
            Math.max(summary.tracked - summary.breached - summary.atRisk, 0),
          )}
          description="Tracked and neither breached nor at risk"
          icon={CheckCircle2}
          variant="success"
        />
      </section>

      <PerformanceBreakdown analysis={analysis} />

      <BreachTrend points={trend} />

      <section className="grid gap-6 lg:grid-cols-2">
        <DimensionTable
          title="Breach by Priority"
          icon={ShieldAlert}
          points={dimensions.priority}
        />

        <DimensionTable
          title="Breach by Team"
          icon={Users}
          points={dimensions.team}
        />
      </section>

      <DimensionTable
        title="Breach by Assignee"
        icon={UserX}
        points={dimensions.assignee}
      />

      <DrillDownActions analysis={analysis} />
    </div>
  );
}
