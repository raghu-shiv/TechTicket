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
import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

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

import type { GetSlaReportParams } from "@/lib/api/sla-report";
import type {
  SlaReportMetric,
  SlaReportPriorityPoint,
  SlaReportTeamPoint,
  SlaReportAssigneePoint,
  SlaReportTrendPoint,
} from "@/types/sla-report";

export type SlaReportFilters = {
  from: string;
  to: string;
  dateField: "createdAt" | "updatedAt";
  status: string;
  priority: string;
  type: string;
  teamId: string;
  assigneeId: string;
  requesterId: string;
  productId: string;
  unassigned: string;
  unassignedTeam: string;
};

export const DEFAULT_SLA_REPORT_FILTERS: SlaReportFilters = {
  from: "",
  to: "",
  dateField: "createdAt",
  status: "",
  priority: "",
  type: "",
  teamId: "",
  assigneeId: "",
  requesterId: "",
  productId: "",
  unassigned: "",
  unassignedTeam: "",
};

const FILTER_KEYS = [
  "from",
  "to",
  "dateField",
  "status",
  "priority",
  "type",
  "teamId",
  "assigneeId",
  "requesterId",
  "productId",
  "unassigned",
  "unassignedTeam",
] as const;

type FilterKey = (typeof FILTER_KEYS)[number];

export function parseSlaReportFilters(
  search: string | URLSearchParams,
): SlaReportFilters {
  const params =
    typeof search === "string"
      ? new URLSearchParams(search.startsWith("?") ? search.slice(1) : search)
      : search;

  const filters = { ...DEFAULT_SLA_REPORT_FILTERS };

  for (const key of FILTER_KEYS) {
    const value = params.get(key);

    if (value === null) {
      continue;
    }

    if (key === "dateField") {
      if (value === "createdAt" || value === "updatedAt") {
        filters.dateField = value;
      }
      continue;
    }

    if (key === "unassigned" || key === "unassignedTeam") {
      if (value === "true" || value === "false") {
        filters[key] = value;
      }
      continue;
    }

    filters[key] = value;
  }

  if (filters.assigneeId && filters.unassigned) {
    filters.unassigned = "";
  }

  if (filters.teamId && filters.unassignedTeam) {
    filters.unassignedTeam = "";
  }

  return filters;
}

export function serializeSlaReportFilters(filters: SlaReportFilters): string {
  const params = new URLSearchParams();

  for (const key of FILTER_KEYS) {
    const value = filters[key];

    if (value !== "") {
      params.set(key, value);
    }
  }

  return params.toString();
}

export function isValidSlaReportDateRange(from: string, to: string): boolean {
  if (!from || !to) {
    return true;
  }

  // HTML date inputs use YYYY-MM-DD. Lexicographical comparison is valid
  // for that fixed-width format.
  return from <= to;
}

export function buildSlaReportParams(
  filters: SlaReportFilters,
): GetSlaReportParams {
  const validDateRange = isValidSlaReportDateRange(filters.from, filters.to);

  return {
    from:
      validDateRange && filters.from
        ? `${filters.from}T00:00:00.000Z`
        : undefined,
    to:
      validDateRange && filters.to ? `${filters.to}T23:59:59.999Z` : undefined,
    dateField: filters.dateField,
    status: filters.status || undefined,
    priority: filters.priority || undefined,
    type: filters.type || undefined,
    teamId: filters.teamId || undefined,
    assigneeId: filters.assigneeId || undefined,
    requesterId: filters.requesterId || undefined,
    productId: filters.productId || undefined,
    unassigned: filters.unassigned ? filters.unassigned === "true" : undefined,
    unassignedTeam: filters.unassignedTeam
      ? filters.unassignedTeam === "true"
      : undefined,
  };
}

function getDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDefaultDates(): Pick<SlaReportFilters, "from" | "to"> {
  const to = new Date();
  const from = new Date(to);

  from.setDate(from.getDate() - 29);

  return {
    from: getDateString(from),
    to: getDateString(to),
  };
}

function formatRate(rate: number | null): string {
  return rate === null ? "—" : `${rate.toFixed(1)}%`;
}

export function SlaReport() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const searchString = searchParams.toString();

  const filters = useMemo(() => {
    const parsed = parseSlaReportFilters(searchString);

    if (!parsed.from && !parsed.to) {
      return {
        ...parsed,
        ...getDefaultDates(),
      };
    }

    return parsed;
  }, [searchString]);

  const updateFilter = useCallback(
    <K extends FilterKey>(key: K, value: SlaReportFilters[K]) => {
      const next = { ...filters, [key]: value };

      if (key === "assigneeId" && value) {
        next.unassigned = "";
      }

      if (key === "unassigned" && value) {
        next.assigneeId = "";
      }

      if (key === "teamId" && value) {
        next.unassignedTeam = "";
      }

      if (key === "unassignedTeam" && value) {
        next.teamId = "";
      }

      const query = serializeSlaReportFilters(next);
      const currentUrl = new URL(window.location.href);

      currentUrl.search = query;

      router.replace(
        currentUrl.pathname + (query ? `?${query}` : "") + currentUrl.hash,
        { scroll: false },
      );
    },
    [filters, router],
  );

  const resetFilters = useCallback(() => {
    const defaults = {
      ...DEFAULT_SLA_REPORT_FILTERS,
      ...getDefaultDates(),
    };

    const query = serializeSlaReportFilters(defaults);
    const currentUrl = new URL(window.location.href);

    currentUrl.search = query;

    router.replace(
      currentUrl.pathname + (query ? `?${query}` : "") + currentUrl.hash,
      { scroll: false },
    );
  }, [router]);

  const dateRangeValid = isValidSlaReportDateRange(filters.from, filters.to);

  const reportParams = useMemo(() => buildSlaReportParams(filters), [filters]);

  const reportQuery = useSlaReport(organizationId, reportParams);

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

  if (!dateRangeValid) {
    return (
      <div className="space-y-6">
        <SlaReportHeader />
        <SlaReportFilterPanel
          filters={filters}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
        />
        <p role="alert" className="text-sm text-destructive">
          The start date must be on or before the end date.
        </p>
      </div>
    );
  }

  if (reportQuery.isLoading) {
    return <LoadingState label="Loading SLA report..." />;
  }

  if (reportQuery.isError) {
    return (
      <div className="space-y-6">
        <SlaReportHeader />
        <SlaReportFilterPanel
          filters={filters}
          updateFilter={updateFilter}
          resetFilters={resetFilters}
        />
        <ErrorState
          title="Unable to load SLA report"
          description={
            reportQuery.error instanceof Error
              ? reportQuery.error.message
              : "We couldn't load SLA reporting data."
          }
          onRetry={() => reportQuery.refetch()}
        />
      </div>
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
      <SlaReportHeader />

      <SlaReportFilterPanel
        filters={filters}
        updateFilter={updateFilter}
        resetFilters={resetFilters}
      />

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

      <SlaTrendCard trend={trend} />
      <SlaPriorityCard points={byPriority} />

      <SlaDimensionCard title="SLA by Team" icon={Users} points={byTeam} />

      <SlaDimensionCard
        title="SLA by Assignee"
        icon={Users}
        points={byAssignee}
      />

      <SlaBreachAnalysis analysis={breachAnalysis} />
    </div>
  );
}

function SlaReportHeader() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">SLA Reports</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Analyze SLA compliance, breaches, at-risk tickets, first-response
        performance, and resolution performance.
      </p>
    </div>
  );
}

function SlaReportFilterPanel({
  filters,
  updateFilter,
  resetFilters,
}: {
  filters: SlaReportFilters;
  updateFilter: <K extends FilterKey>(
    key: K,
    value: SlaReportFilters[K],
  ) => void;
  resetFilters: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>Report filters</CardTitle>
          <button
            type="button"
            onClick={resetFilters}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Reset filters
          </button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            id="sla-report-date-field"
            label="Date field"
            value={filters.dateField}
            onChange={(value) =>
              updateFilter("dateField", value as SlaReportFilters["dateField"])
            }
            options={[
              { label: "Created date", value: "createdAt" },
              { label: "Updated date", value: "updatedAt" },
            ]}
          />

          <FilterInput
            id="sla-report-from"
            label="From"
            type="date"
            value={filters.from}
            onChange={(value) => updateFilter("from", value)}
          />

          <FilterInput
            id="sla-report-to"
            label="To"
            type="date"
            value={filters.to}
            onChange={(value) => updateFilter("to", value)}
          />

          <FilterSelect
            id="sla-report-status"
            label="Status"
            value={filters.status}
            onChange={(value) => updateFilter("status", value)}
            options={[
              { label: "All statuses", value: "" },
              { label: "Open", value: "OPEN" },
              { label: "In progress", value: "IN_PROGRESS" },
              { label: "Pending", value: "PENDING" },
              { label: "Resolved", value: "RESOLVED" },
              { label: "Closed", value: "CLOSED" },
            ]}
          />

          <FilterSelect
            id="sla-report-priority"
            label="Priority"
            value={filters.priority}
            onChange={(value) => updateFilter("priority", value)}
            options={[
              { label: "All priorities", value: "" },
              { label: "Low", value: "LOW" },
              { label: "Medium", value: "MEDIUM" },
              { label: "High", value: "HIGH" },
              { label: "Urgent", value: "URGENT" },
            ]}
          />

          <FilterSelect
            id="sla-report-type"
            label="Ticket type"
            value={filters.type}
            onChange={(value) => updateFilter("type", value)}
            options={[
              { label: "All types", value: "" },
              { label: "Incident", value: "INCIDENT" },
              { label: "Service request", value: "SERVICE_REQUEST" },
              { label: "Problem", value: "PROBLEM" },
              { label: "Change", value: "CHANGE" },
            ]}
          />

          <FilterInput
            id="sla-report-team"
            label="Team ID"
            value={filters.teamId}
            onChange={(value) => updateFilter("teamId", value)}
            placeholder="Enter team ID"
          />

          <FilterInput
            id="sla-report-assignee"
            label="Assignee ID"
            value={filters.assigneeId}
            onChange={(value) => updateFilter("assigneeId", value)}
            placeholder="Enter assignee ID"
          />

          <FilterInput
            id="sla-report-requester"
            label="Requester ID"
            value={filters.requesterId}
            onChange={(value) => updateFilter("requesterId", value)}
            placeholder="Enter requester ID"
          />

          <FilterInput
            id="sla-report-product"
            label="Product ID"
            value={filters.productId}
            onChange={(value) => updateFilter("productId", value)}
            placeholder="Enter product ID"
          />

          <FilterSelect
            id="sla-report-unassigned"
            label="Assignee assignment"
            value={filters.unassigned}
            onChange={(value) => updateFilter("unassigned", value)}
            options={[
              { label: "All assignees", value: "" },
              { label: "Unassigned", value: "true" },
              { label: "Assigned", value: "false" },
            ]}
          />

          <FilterSelect
            id="sla-report-unassigned-team"
            label="Team assignment"
            value={filters.unassignedTeam}
            onChange={(value) => updateFilter("unassignedTeam", value)}
            options={[
              { label: "All teams", value: "" },
              { label: "No team", value: "true" },
              { label: "Has team", value: "false" },
            ]}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function FilterInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="mb-1 block text-xs font-medium text-muted-foreground"
      >
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
  const padding = { top: 24, right: 24, bottom: 52, left: 48 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const maximum = Math.max(...trend.map((point) => point.tracked), 1);

  const getX = (index: number) =>
    trend.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (index / (trend.length - 1)) * chartWidth;

  const getY = (value: number) =>
    padding.top + chartHeight - (value / maximum) * chartHeight;

  const buildPath = (selector: (point: SlaReportTrendPoint) => number) =>
    trend
      .map(
        (point, index) =>
          `${index === 0 ? "M" : "L"} ${getX(index)} ${getY(selector(point))}`,
      )
      .join(" ");

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
              d={buildPath((point) => point.tracked)}
              fill="none"
              className="stroke-primary"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={buildPath((point) => point.breached)}
              fill="none"
              className="stroke-red-500"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {trend.map((point, index) => (
              <g key={point.date}>
                <title>
                  {formatDate(point.date)} — {point.tracked} tracked,{" "}
                  {point.breached} breached, {formatRate(point.breachRate)}
                </title>
                <circle
                  cx={getX(index)}
                  cy={getY(point.tracked)}
                  r="3"
                  className="fill-primary"
                />
                <circle
                  cx={getX(index)}
                  cy={getY(point.breached)}
                  r="3"
                  className="fill-red-500"
                />
                {(index === 0 ||
                  index === trend.length - 1 ||
                  trend.length <= 7 ||
                  index % Math.ceil(trend.length / 6) === 0) && (
                  <text
                    x={getX(index)}
                    y={height - 16}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[11px]"
                  >
                    {formatDate(point.date)}
                  </text>
                )}
              </g>
            ))}
          </svg>
        </div>
      </CardContent>
    </Card>
  );
}

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
            description="No SLA records match the selected filters."
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
                  Breach rate
                </th>
                <th className="px-3 py-3 text-right font-medium">At risk</th>
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
            description="No SLA records match the selected filters."
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
                  Breach rate
                </th>
                <th className="px-3 py-3 text-right font-medium">At risk</th>
                <th className="px-3 py-3 text-right font-medium">Resolution</th>
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
