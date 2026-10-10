"use client";

import { useMemo, useState } from "react";
import { Inbox, ShieldAlert } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared";
import { useEmployeeDashboard } from "@/hooks/use-employee-dashboard";
import { useOrganizations } from "@/hooks/use-organizations";

function localDateInput(value: Date) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function dateDaysAgo(days: number) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return localDateInput(date);
}

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function formatRate(value: number | null) {
  return value === null ? "—" : `${value.toFixed(1)}%`;
}

function formatMinutes(value: number | null) {
  if (value === null) return "—";
  if (value < 60) return `${Math.round(value)}m`;
  if (value < 1_440) return `${(value / 60).toFixed(1)}h`;
  return `${(value / 1_440).toFixed(1)}d`;
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: string | number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tabular-nums">{value}</p>
        {description && (
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function WorkloadBars({
  title,
  rows,
  description,
}: {
  title: string;
  rows: Array<{ id: string; name: string; count: number }>;
  description: string;
}) {
  const maximum = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workload data for this selection.
          </p>
        ) : (
          rows.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[minmax(5rem,8rem)_1fr_3rem] items-center gap-3"
            >
              <span className="truncate text-sm" title={row.name}>
                {row.name}
              </span>
              <div
                className="h-2.5 overflow-hidden rounded-full bg-muted"
                role="meter"
                aria-label={`${row.name} active ticket workload`}
                aria-valuemin={0}
                aria-valuemax={maximum}
                aria-valuenow={row.count}
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(row.count / maximum) * 100}%` }}
                />
              </div>
              <span className="text-right text-sm font-semibold tabular-nums">
                {formatCount(row.count)}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function EmployeeDashboard() {
  const organizationsQuery = useOrganizations();
  const membership = organizationsQuery.data?.[0];
  const organizationId = membership?.organizationId;
  const role = membership?.role;
  const canViewOrganization = role === "OWNER" || role === "ADMIN";
  const denied = role === "REQUESTER";

  const [from, setFrom] = useState(() => dateDaysAgo(29));
  const [to, setTo] = useState(() => localDateInput(new Date()));
  const [employeeId, setEmployeeId] = useState("");
  const [teamId, setTeamId] = useState("");

  const validRange = !from || !to || from <= to;
  const params = useMemo(
    () => ({
      dateField: "createdAt" as const,
      from: from ? `${from}T00:00:00.000Z` : undefined,
      to: to ? `${to}T23:59:59.999Z` : undefined,
      employeeId: canViewOrganization ? employeeId || undefined : undefined,
      teamId: teamId || undefined,
    }),
    [from, to, canViewOrganization, employeeId, teamId],
  );

  const reportQuery = useEmployeeDashboard(
    organizationId,
    params,
    !denied && validRange,
  );
  const report = reportQuery.data?.data;

  if (organizationsQuery.isLoading) {
    return <LoadingState label="Loading organization..." />;
  }

  if (organizationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load organization"
        description="The Employee Dashboard could not determine the active organization."
        onRetry={() => organizationsQuery.refetch()}
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

  if (denied) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Employee analytics not available"
        description="Employee-performance analytics are restricted to agents for their own data, and organization-wide comparisons are restricted to organization owners and administrators."
      />
    );
  }

  if (!validRange) {
    return (
      <div
        className="rounded-md border border-destructive/30 p-4 text-sm text-destructive"
        role="alert"
      >
        The start date must be on or before the end date.
      </div>
    );
  }

  if (reportQuery.isLoading) {
    return <LoadingState label="Loading Employee Dashboard..." />;
  }

  if (reportQuery.isError) {
    return (
      <ErrorState
        title="Unable to load Employee Dashboard"
        description={
          reportQuery.error instanceof Error
            ? reportQuery.error.message
            : "The report could not be loaded."
        }
        onRetry={() => reportQuery.refetch()}
      />
    );
  }

  if (!report || !reportQuery.data) return <LoadingState />;

  const metrics = report.metrics;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Performance filters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Date range selects the ticket cohort for the main metrics. Current
            workload is a live snapshot; the resolution trend is bucketed by
            each ticket&apos;s actual resolved date.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            From
            <Input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium text-muted-foreground">
            To
            <Input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
          {canViewOrganization && (
            <FilterSelect
              label="Employee"
              value={employeeId}
              onChange={setEmployeeId}
            >
              <option value="">All agents</option>
              {report.availableEmployees.map((employee) => (
                <option value={employee.id} key={employee.id}>
                  {employee.name}
                </option>
              ))}
            </FilterSelect>
          )}
          <FilterSelect label="Team" value={teamId} onChange={setTeamId}>
            <option value="">All permitted teams</option>
            {report.availableTeams.map((team) => (
              <option value={team.id} key={team.id}>
                {team.name}
              </option>
            ))}
          </FilterSelect>
        </CardContent>
      </Card>

      {!canViewOrganization && (
        <p className="rounded-md border p-3 text-sm text-muted-foreground">
          Personal view: the server restricts all metrics to your own tickets.
          Employee and team comparisons are not included.
        </p>
      )}

      <section
        aria-label="Employee performance metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
      >
        <MetricCard
          title="Assigned tickets"
          value={formatCount(metrics.assignedTickets)}
          description="Assigned in the selected ticket cohort"
        />
        <MetricCard
          title="Open workload"
          value={formatCount(metrics.openWorkload)}
          description="Open, in progress, or pending in the cohort"
        />
        <MetricCard
          title="Resolved tickets"
          value={formatCount(metrics.resolvedTickets)}
          description="Currently resolved within the cohort"
        />
        <MetricCard
          title="Current workload"
          value={formatCount(metrics.currentWorkload)}
          description="Live active assigned tickets, regardless of date range"
        />
        <MetricCard
          title="Reopened tickets"
          value={formatCount(metrics.reopenedTickets)}
          description="Distinct tickets with a recorded reopen transition in the selected event window"
        />
      </section>

      <section
        aria-label="Response, resolution, and SLA metrics"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <MetricCard
          title="Average first response"
          value={formatMinutes(metrics.averageFirstResponseMinutes)}
          description="Elapsed time from ticket creation to first response"
        />
        <MetricCard
          title="Average resolution time"
          value={formatMinutes(metrics.averageResolutionMinutes)}
          description="Elapsed time from ticket creation to current resolution timestamp"
        />
        <MetricCard
          title="Overall SLA compliance"
          value={formatRate(metrics.sla.complianceRate)}
          description={`${formatCount(metrics.sla.compliant)} compliant / ${formatCount(metrics.sla.tracked)} tracked tickets`}
        />
        <MetricCard
          title="SLA breaches"
          value={formatCount(metrics.sla.breached)}
          description="Tickets with a first-response or resolution breach timestamp"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="SLA breakdown">
        <Card>
          <CardHeader>
            <CardTitle>First-response SLA</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SmallMetric
              label="Completed"
              value={metrics.sla.firstResponse.completed}
            />
            <SmallMetric
              label="Compliant"
              value={metrics.sla.firstResponse.compliant}
            />
            <SmallMetric
              label="Breached"
              value={metrics.sla.firstResponse.breached}
            />
            <SmallMetric
              label="Compliance"
              value={formatRate(metrics.sla.firstResponse.complianceRate)}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Resolution SLA</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <SmallMetric
              label="Completed"
              value={metrics.sla.resolution.completed}
            />
            <SmallMetric
              label="Compliant"
              value={metrics.sla.resolution.compliant}
            />
            <SmallMetric
              label="Breached"
              value={metrics.sla.resolution.breached}
            />
            <SmallMetric
              label="Compliance"
              value={formatRate(metrics.sla.resolution.complianceRate)}
            />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <WorkloadBars
          title="Workload distribution"
          rows={report.workloadDistribution}
          description="Current OPEN, IN_PROGRESS, and PENDING tickets assigned to each permitted employee."
        />
        {canViewOrganization && (
          <WorkloadBars
            title="Team comparison"
            rows={report.teamComparison}
            description="Current active assigned tickets by team in this organization."
          />
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Resolution trend</CardTitle>
          <p className="text-sm text-muted-foreground">
            Grouped by resolvedAt in the selected date window.
          </p>
        </CardHeader>
        <CardContent>
          {report.resolutionTrend.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tickets were resolved in the selected period.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">
                      Resolved date (UTC)
                    </th>
                    <th className="py-2 pr-4 font-medium">Resolved tickets</th>
                    <th className="py-2 font-medium">
                      Average resolution time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.resolutionTrend.map((point) => (
                    <tr className="border-b last:border-0" key={point.date}>
                      <td className="py-3 pr-4">
                        {new Date(point.date).toISOString().slice(0, 10)}
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex min-w-32 items-center gap-3">
                          <span className="w-8 tabular-nums">
                            {formatCount(point.resolvedTickets)}
                          </span>
                          <div className="h-2 flex-1 rounded-full bg-muted">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{
                                width: `${(point.resolvedTickets / Math.max(1, ...report.resolutionTrend.map((item) => item.resolvedTickets))) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3">
                        {formatMinutes(point.averageResolutionMinutes)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Scope:{" "}
        {reportQuery.data.meta.accessScope.toLowerCase().replaceAll("_", " ")}.
        Current workload snapshot:{" "}
        {new Date(reportQuery.data.meta.currentWorkloadAsOf).toLocaleString()}.
        Reopen classification uses recorded status-change audit events; it does
        not introduce a new persistence model.
      </p>
    </div>
  );
}

function SmallMetric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
