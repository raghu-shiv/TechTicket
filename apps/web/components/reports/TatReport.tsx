"use client";

import { useMemo, useState } from "react";

import { useOrganizations } from "@/hooks/use-organizations";
import { useTatReport } from "@/hooks/use-tat-report";
import type { TatMetric } from "@/types/tat-report";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";

function formatMinutes(minutes: number | null): string {
  if (minutes === null || !Number.isFinite(minutes)) return "—";

  if (minutes < 60) {
    return `${minutes.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })} min`;
  }

  const hours = minutes / 60;

  if (hours < 48) {
    return `${hours.toLocaleString(undefined, {
      maximumFractionDigits: 1,
    })} hr`;
  }

  return `${(hours / 24).toLocaleString(undefined, {
    maximumFractionDigits: 1,
  })} days`;
}

function MetricCard({ title, metric }: { title: string; metric: TatMetric }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-2xl font-semibold">
          {formatMinutes(metric.averageMinutes)}
        </p>
        <p className="text-sm text-muted-foreground">
          Median {formatMinutes(metric.medianMinutes)}
        </p>
        <p className="text-xs text-muted-foreground">
          P90 {formatMinutes(metric.p90Minutes)} · {metric.sampleSize} valid
          samples
        </p>
      </CardContent>
    </Card>
  );
}

function BreakdownTable({
  title,
  rows,
}: {
  title: string;
  rows: Array<{
    key: string;
    label: string;
    firstResponse: TatMetric;
    resolution: TatMetric;
  }>;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No data for the selected filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">Group</th>
                  <th className="py-2 pr-4 font-medium">First response avg</th>
                  <th className="py-2 pr-4 font-medium">Resolution avg</th>
                  <th className="py-2 pr-4 font-medium">Resolution median</th>
                  <th className="py-2 font-medium">Resolution P90</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr className="border-b last:border-0" key={row.key}>
                    <td className="py-3 pr-4">{row.label}</td>
                    <td className="py-3 pr-4">
                      {formatMinutes(row.firstResponse.averageMinutes)}
                    </td>
                    <td className="py-3 pr-4">
                      {formatMinutes(row.resolution.averageMinutes)}
                    </td>
                    <td className="py-3 pr-4">
                      {formatMinutes(row.resolution.medianMinutes)}
                    </td>
                    <td className="py-3">
                      {formatMinutes(row.resolution.p90Minutes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function TatReport() {
  const organization = useOrganizations();
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const params = useMemo(
    () => ({
      dateField: "createdAt" as const,
      from: from || undefined,
      to: to || undefined,
      status: "RESOLVED",
      page,
      limit: 25,
    }),
    [from, to, page],
  );

  /*
   * Adapt this organization property to the exact shape returned by the
   * existing useOrganizations hook if its field name differs.
   */
  const organizationId = organization.data?.[0]?.organizationId;

  const { data, isLoading, isError, error } = useTatReport(
    organizationId,
    params,
  );

  const report = data?.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Actual elapsed operational time</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            TAT is measured from actual ticket timestamps. SLA target durations
            and compliance are reported separately.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Created from</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPage(1);
                }}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">Created to</span>
              <input
                className="w-full rounded-md border bg-background px-3 py-2"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
        </CardContent>
      </Card>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Loading TAT report…</p>
      )}

      {isError && (
        <p role="alert" className="text-sm text-destructive">
          {error instanceof Error
            ? error.message
            : "Unable to load TAT report."}
        </p>
      )}

      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Tickets in cohort
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {report.summary.ticketCount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Resolved tickets
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">
                  {report.summary.resolvedTicketCount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <MetricCard
              title="Time to first response"
              metric={report.summary.firstResponse}
            />

            <MetricCard
              title="Time to resolution"
              metric={report.summary.resolution}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>TAT trend by ticket creation date</CardTitle>
            </CardHeader>
            <CardContent>
              {report.trend.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No trend data for the selected period.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Date (UTC)</th>
                        <th className="py-2 pr-4 font-medium">Tickets</th>
                        <th className="py-2 pr-4 font-medium">
                          First response avg
                        </th>
                        <th className="py-2 pr-4 font-medium">
                          Resolution avg
                        </th>
                        <th className="py-2 font-medium">Resolution P90</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.trend.map((point) => (
                        <tr className="border-b last:border-0" key={point.date}>
                          <td className="py-3 pr-4">
                            {new Date(point.date).toLocaleDateString()}
                          </td>
                          <td className="py-3 pr-4">{point.createdTickets}</td>
                          <td className="py-3 pr-4">
                            {formatMinutes(point.firstResponse.averageMinutes)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatMinutes(point.resolution.averageMinutes)}
                          </td>
                          <td className="py-3">
                            {formatMinutes(point.resolution.p90Minutes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <BreakdownTable title="TAT by priority" rows={report.byPriority} />
          <BreakdownTable title="TAT by team" rows={report.byTeam} />
          <BreakdownTable title="TAT by employee" rows={report.byAssignee} />
          <BreakdownTable title="TAT by product" rows={report.byProduct} />

          <Card>
            <CardHeader>
              <CardTitle>Resolved-ticket drill-down</CardTitle>
            </CardHeader>
            <CardContent>
              {report.resolvedTickets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No resolved tickets with valid resolution duration.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="py-2 pr-4 font-medium">Ticket</th>
                        <th className="py-2 pr-4 font-medium">Priority</th>
                        <th className="py-2 pr-4 font-medium">Team</th>
                        <th className="py-2 pr-4 font-medium">Assignee</th>
                        <th className="py-2 pr-4 font-medium">Product</th>
                        <th className="py-2 font-medium">Resolution TAT</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.resolvedTickets.map((ticket) => (
                        <tr className="border-b last:border-0" key={ticket.id}>
                          <td className="py-3 pr-4">
                            <a
                              className="font-medium underline underline-offset-4"
                              href={`/tickets/${ticket.id}`}
                            >
                              {ticket.ticketNumber}
                            </a>
                            <div className="max-w-xs truncate text-muted-foreground">
                              {ticket.title}
                            </div>
                          </td>
                          <td className="py-3 pr-4">{ticket.priority}</td>
                          <td className="py-3 pr-4">
                            {ticket.team?.name ?? "Unassigned"}
                          </td>
                          <td className="py-3 pr-4">
                            {ticket.assignee?.name ?? "Unassigned"}
                          </td>
                          <td className="py-3 pr-4">
                            {ticket.product?.name ?? "Unclassified"}
                          </td>
                          <td className="py-3">
                            {formatMinutes(ticket.resolutionMinutes)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                      Page {report && data.meta.pagination.page} of{" "}
                      {data.meta.pagination.totalPages}
                    </p>

                    <div className="flex gap-2">
                      <button
                        className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => current - 1)}
                      >
                        Previous
                      </button>
                      <button
                        className="rounded-md border px-3 py-2 text-sm disabled:opacity-40"
                        disabled={page >= data.meta.pagination.totalPages}
                        onClick={() => setPage((current) => current + 1)}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
