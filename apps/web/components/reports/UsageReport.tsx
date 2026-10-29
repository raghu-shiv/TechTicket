"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useOrganizations } from "@/hooks/use-organizations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ReportExportButton } from "@/components/reports/ReportExportButton";

export interface UsageReportSummary {
  ticketsCreated: number;
  activitiesRecorded: number;
  commentsCreated: number;
  attachmentsUploaded: number;
  approvalRequests: number;
  approvalsApproved: number;
  approvalsRejected: number;
  activeUsers: number;
  activeAgents: number;
}

export interface UsageReportTrendPoint {
  date: string;
  ticketsCreated: number;
  activitiesRecorded: number;
  commentsCreated: number;
  attachmentsUploaded: number;
  approvalRequests: number;
}

export interface UsageReportResponse {
  summary: UsageReportSummary;
  trends: UsageReportTrendPoint[];
  period: {
    from: string | null;
    to: string | null;
  };
  metricAvailability: {
    notifications: "unavailable";
  };
}

export interface GetUsageReportParams {
  from?: string;
  to?: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

/**
 * Kept independently testable so API behavior can be verified without
 * mounting React components or requiring a browser test environment.
 */
export async function fetchUsageReport(
  organizationId: string,
  params: GetUsageReportParams = {},
): Promise<UsageReportResponse> {
  const search = new URLSearchParams();

  if (params.from) search.set("from", params.from);
  if (params.to) search.set("to", params.to);

  const url = new URL(`${API_BASE_URL}/reports/analytics/usage`);

  if (search.size > 0) {
    url.search = search.toString();
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Failed to fetch usage report";

    try {
      const body = (await response.json()) as {
        message?: string | string[];
      };

      if (Array.isArray(body.message)) {
        message = body.message.join(", ");
      } else if (body.message) {
        message = body.message;
      }
    } catch {
      // Keep the fallback message when the server returns no JSON body.
    }

    throw new Error(message);
  }

  return response.json() as Promise<UsageReportResponse>;
}

function formatCount(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";

  return value.toLocaleString();
}

function MetricCard({
  title,
  value,
  description,
}: {
  title: string;
  value: number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        <p className="font-display text-3xl font-semibold leading-none tracking-tight tabular-nums">
          {formatCount(value)}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

const TREND_METRICS = [
  { key: "ticketsCreated", label: "Tickets created" },
  { key: "activitiesRecorded", label: "Recorded activities" },
  { key: "commentsCreated", label: "Comments" },
  { key: "attachmentsUploaded", label: "Attachments" },
  { key: "approvalRequests", label: "Approval requests" },
] as const;

export function UsageReport() {
  const organization = useOrganizations();
  const organizationId = organization.data?.[0]?.organizationId;

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const invalidDateRange = Boolean(from && to && from > to);

  const params = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
    }),
    [from, to],
  );

  const {
    data: report,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["usage-report", organizationId, params],
    queryFn: () => fetchUsageReport(organizationId!, params),
    enabled: Boolean(organizationId) && !invalidDateRange,
    staleTime: 30_000,
  });

  const trendMaximum = useMemo(
    () =>
      Math.max(
        1,
        ...(report?.trends ?? []).flatMap((point) =>
          TREND_METRICS.map((metric) => point[metric.key]),
        ),
      ),
    [report?.trends],
  );

  return (
    <div className="space-y-6">
      <Card className="report-filter-panel">
        <CardHeader>
          <CardTitle>Organization usage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Review recorded ticket activity and feature usage for the selected
            period. Counts are based on persisted application records, not
            estimated interactions.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">From date (UTC)</span>
              <input
                aria-label="From date"
                className="report-control"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium">To date (UTC)</span>
              <input
                aria-label="To date"
                className="report-control"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </label>
          </div>

          {invalidDateRange && (
            <p role="alert" className="text-sm text-destructive">
              The start date must be on or before the end date.
            </p>
          )}

          {from && to && !invalidDateRange && (
            <button
              type="button"
              className="text-sm font-medium underline"
              onClick={() => {
                setFrom("");
                setTo("");
              }}
            >
              Clear date filters
            </button>
          )}
          <ReportExportButton
            report="usage"
            disabled={invalidDateRange}
            params={{
              from: from || undefined,
              to: to || undefined,
            }}
          />
        </CardContent>
      </Card>

      {organization.isLoading && (
        <p className="text-sm text-muted-foreground">Loading organization…</p>
      )}

      {!organization.isLoading && !organizationId && (
        <p role="alert" className="text-sm text-destructive">
          No organization is available for this report.
        </p>
      )}

      {isLoading && (
        <p role="status" className="text-sm text-muted-foreground">
          Loading usage report…
        </p>
      )}

      {isError && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p role="alert" className="text-sm text-destructive">
              {error instanceof Error
                ? error.message
                : "Unable to load the usage report."}
            </p>
            <button
              type="button"
              className="rounded-md border px-3 py-2 text-sm"
              onClick={() => void refetch()}
            >
              Retry
            </button>
          </CardContent>
        </Card>
      )}

      {report && !isError && (
        <>
          <section aria-label="Usage summary" className="space-y-3">
            <h2 className="text-lg font-semibold">Usage summary</h2>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                title="Tickets created"
                value={report.summary.ticketsCreated}
              />
              <MetricCard
                title="Recorded activities"
                value={report.summary.activitiesRecorded}
                description="Events recorded in ticket activity history"
              />
              <MetricCard
                title="Comments created"
                value={report.summary.commentsCreated}
              />
              <MetricCard
                title="Attachments uploaded"
                value={report.summary.attachmentsUploaded}
              />
              <MetricCard
                title="Approval requests"
                value={report.summary.approvalRequests}
              />
              <MetricCard
                title="Approvals accepted"
                value={report.summary.approvalsApproved}
              />
              <MetricCard
                title="Approvals rejected"
                value={report.summary.approvalsRejected}
              />
              <MetricCard
                title="Active users"
                value={report.summary.activeUsers}
                description="Distinct users with recorded ticket activity"
              />
              <MetricCard
                title="Active agents"
                value={report.summary.activeAgents}
                description="Agents with recorded ticket activity"
              />
            </div>
          </section>

          <Card>
            <CardHeader>
              <CardTitle>Daily usage trends</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Each bar represents a metric&apos;s recorded count for that
                date. Bar lengths are scaled against the largest value in the
                selected period.
              </p>

              {report.trends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No trend data for the selected period.
                </p>
              ) : (
                <div className="space-y-5">
                  {report.trends.map((point) => (
                    <div key={point.date} className="space-y-2">
                      <h3 className="text-sm font-medium">{point.date}</h3>

                      {TREND_METRICS.map((metric) => {
                        const value = point[metric.key];
                        const width = (value / trendMaximum) * 100;

                        return (
                          <div
                            key={metric.key}
                            className="grid grid-cols-[minmax(100px,150px)_1fr_55px] items-center gap-3 text-xs sm:text-sm"
                          >
                            <span className="text-muted-foreground">
                              {metric.label}
                            </span>
                            <div
                              className="h-2 overflow-hidden rounded-full bg-muted"
                              role="progressbar"
                              aria-label={`${point.date}: ${metric.label}`}
                              aria-valuemin={0}
                              aria-valuemax={trendMaximum}
                              aria-valuenow={value}
                            >
                              <div
                                className="h-full rounded-full bg-chart-1"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                            <span className="text-right tabular-nums">
                              {formatCount(value)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily usage details</CardTitle>
            </CardHeader>
            <CardContent>
              {report.trends.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No daily usage records are available.
                </p>
              ) : (
                <div
                  className="overflow-x-auto report-table-wrap"
                  role="region"
                  aria-label="Daily usage details table"
                  tabIndex={0}
                >
                  <table className="w-full text-sm report-table">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Date (UTC)
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Tickets
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Activities
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Comments
                        </th>
                        <th scope="col" className="py-2 pr-4 font-medium">
                          Attachments
                        </th>
                        <th scope="col" className="py-2 font-medium">
                          Approval requests
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.trends.map((point) => (
                        <tr className="border-b last:border-0" key={point.date}>
                          <td className="py-3 pr-4 whitespace-nowrap">
                            {point.date}
                          </td>
                          <td className="py-3 pr-4">
                            {formatCount(point.ticketsCreated)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatCount(point.activitiesRecorded)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatCount(point.commentsCreated)}
                          </td>
                          <td className="py-3 pr-4">
                            {formatCount(point.attachmentsUploaded)}
                          </td>
                          <td className="py-3">
                            {formatCount(point.approvalRequests)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Metric availability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                Notifications:{" "}
                <span className="font-medium">Not available</span>
              </p>
              <p className="text-muted-foreground">
                Notification delivery counts are not shown because a durable
                notification history source is not currently available in this
                report contract.
              </p>
              <p className="text-muted-foreground">
                Active users and agents are based on recorded ticket activity;
                they are not a measure of login sessions or all application
                interactions.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
