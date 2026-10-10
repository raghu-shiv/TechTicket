"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { ErrorState, LoadingState } from "@/components/shared";
import { useOrganizations } from "@/hooks/use-organizations";
import { useTicketLibraryReport } from "@/hooks/use-ticket-library-report";
import { getProducts } from "@/lib/api/products";
import {
  buildTicketLibraryReportDrilldownUrl,
  ticketLibraryReportParamsFromSearchParams,
  updateTicketLibraryReportSearchParams,
} from "@/lib/ticket-library-report-drilldown";
import { savedFilterToSearchParams } from "@/lib/saved-filters";
import type { TicketLibraryReportPoint } from "@/types/ticket-library-report";

const STATUS_OPTIONS = [
  ["OPEN", "Open"],
  ["IN_PROGRESS", "In progress"],
  ["PENDING", "Pending"],
  ["RESOLVED", "Resolved"],
  ["CLOSED", "Closed"],
] as const;

const PRIORITY_OPTIONS = [
  ["URGENT", "Urgent"],
  ["HIGH", "High"],
  ["MEDIUM", "Medium"],
  ["LOW", "Low"],
] as const;

const TYPE_OPTIONS = [
  ["INCIDENT", "Incident"],
  ["SERVICE_REQUEST", "Service request"],
  ["QUESTION", "Question"],
  ["PROBLEM", "Problem"],
] as const;

function formatCount(value: number) {
  return new Intl.NumberFormat().format(value);
}

function buildQueryString(params: URLSearchParams) {
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildSavedFilterUrl(
  filters: Parameters<typeof savedFilterToSearchParams>[0],
) {
  const params = savedFilterToSearchParams(filters);
  const query = params.toString();

  return query ? `/tickets?${query}` : "/tickets";
}

function MetricCard({
  title,
  value,
  href,
  description,
}: {
  title: string;
  value: number;
  href: string;
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
        <Link
          href={href}
          className="text-3xl font-semibold underline-offset-4 hover:underline"
        >
          {formatCount(value)}
        </Link>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
        <p className="mt-3 text-xs font-medium text-primary">
          View matching tickets →
        </p>
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

function DateFilter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
      />
    </label>
  );
}

function BreakdownCard({
  title,
  rows,
  hrefForRow,
}: {
  title: string;
  rows: TicketLibraryReportPoint[];
  hrefForRow: (row: TicketLibraryReportPoint) => string;
}) {
  const maximum = Math.max(1, ...rows.map((row) => row.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tickets match the selected filters.
          </p>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={row.key}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Link
                    href={hrefForRow(row)}
                    className="truncate font-medium underline-offset-4 hover:text-primary hover:underline"
                  >
                    {row.label}
                  </Link>
                  <Link
                    href={hrefForRow(row)}
                    className="shrink-0 tabular-nums text-muted-foreground hover:text-primary"
                    aria-label={`View ${row.count} tickets for ${row.label}`}
                  >
                    {formatCount(row.count)}
                  </Link>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{
                      width: `${Math.min(100, (row.count / maximum) * 100)}%`,
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

function TicketLibraryReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const organizations = useOrganizations();
  const organizationId = organizations.data?.[0]?.organizationId;

  const currentSearch = searchParams.toString();

  const currentParams = useMemo(
    () => new URLSearchParams(currentSearch),
    [currentSearch],
  );

  const reportParams = useMemo(
    () => ticketLibraryReportParamsFromSearchParams(currentParams),
    [currentParams],
  );

  const reportQuery = useTicketLibraryReport(organizationId, reportParams);
  const report = reportQuery.data?.data;

  const productsQuery = useQuery({
    queryKey: ["products", organizationId],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return getProducts(organizationId);
    },
    enabled: Boolean(organizationId),
  });

  function updateFilters(
    updates: Record<string, string | boolean | null | undefined>,
  ) {
    const next = updateTicketLibraryReportSearchParams(currentParams, updates);

    router.replace(`/reports/ticket-library${buildQueryString(next)}`, {
      scroll: false,
    });
  }

  function setLastDays(days: number) {
    const end = new Date();
    const start = new Date(end);
    start.setUTCDate(start.getUTCDate() - (days - 1));

    updateFilters({
      dateField: "createdAt",
      createdFrom: start.toISOString().slice(0, 10),
      createdTo: end.toISOString().slice(0, 10),
    });
  }

  const allTicketsHref = buildTicketLibraryReportDrilldownUrl(currentParams);

  if (organizations.isLoading) {
    return <LoadingState label="Loading workspace..." />;
  }

  if (organizations.isError) {
    return (
      <ErrorState
        title="Unable to load workspace"
        description="The organization context could not be loaded."
        onRetry={() => organizations.refetch()}
      />
    );
  }

  if (!organizationId) {
    return (
      <p className="text-sm text-muted-foreground">
        No organization is available for reporting.
      </p>
    );
  }

  if (reportQuery.isLoading) {
    return <LoadingState label="Loading Ticket Library report..." />;
  }

  if (reportQuery.isError) {
    return (
      <ErrorState
        title="Unable to load Ticket Library report"
        description={
          reportQuery.error instanceof Error
            ? reportQuery.error.message
            : "The report could not be loaded."
        }
        onRetry={() => reportQuery.refetch()}
      />
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Report filters</CardTitle>
          <p className="text-sm text-muted-foreground">
            Filter state is kept in the URL and carried into Ticket Library
            drill-down links.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Search
              </span>
              <input
                value={currentParams.get("search") ?? ""}
                onChange={(event) =>
                  updateFilters({ search: event.target.value || null })
                }
                placeholder="Ticket number, title, description"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>

            <FilterSelect
              label="Status"
              value={currentParams.get("status") ?? ""}
              onChange={(value) => updateFilters({ status: value || null })}
            >
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Priority"
              value={currentParams.get("priority") ?? ""}
              onChange={(value) => updateFilters({ priority: value || null })}
            >
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Type"
              value={currentParams.get("type") ?? ""}
              onChange={(value) => updateFilters({ type: value || null })}
            >
              <option value="">All types</option>
              {TYPE_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </FilterSelect>

            <FilterSelect
              label="Team"
              value={currentParams.get("teamId") ?? ""}
              onChange={(value) =>
                updateFilters({
                  teamId: value || null,
                  unassignedTeam: null,
                })
              }
            >
              <option value="">All teams</option>
              {report.byTeam
                .filter((row) => row.id !== null)
                .map((row) => (
                  <option key={row.id!} value={row.id!}>
                    {row.label}
                  </option>
                ))}
            </FilterSelect>

            <FilterSelect
              label="Employee"
              value={currentParams.get("assigneeId") ?? ""}
              onChange={(value) =>
                updateFilters({
                  assigneeId: value || null,
                  unassigned: null,
                })
              }
            >
              <option value="">All employees</option>
              {report.byEmployee
                .filter((row) => row.id !== null)
                .map((row) => (
                  <option key={row.id!} value={row.id!}>
                    {row.label}
                  </option>
                ))}
            </FilterSelect>

            <FilterSelect
              label="Product"
              value={currentParams.get("productId") ?? ""}
              onChange={(value) => updateFilters({ productId: value || null })}
            >
              <option value="">All products</option>
              {(productsQuery.data ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                  {!product.isActive ? " (Inactive)" : ""}
                </option>
              ))}
            </FilterSelect>

            <label className="flex min-w-0 flex-col gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Requester ID
              </span>
              <input
                value={currentParams.get("requesterId") ?? ""}
                onChange={(event) =>
                  updateFilters({
                    requesterId: event.target.value.trim() || null,
                  })
                }
                placeholder="Filter by requester"
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>

            <DateFilter
              label="Created from"
              value={currentParams.get("createdFrom") ?? ""}
              onChange={(value) =>
                updateFilters({ createdFrom: value || null })
              }
            />

            <DateFilter
              label="Created to"
              value={currentParams.get("createdTo") ?? ""}
              onChange={(value) => updateFilters({ createdTo: value || null })}
            />

            <DateFilter
              label="Updated from"
              value={currentParams.get("updatedFrom") ?? ""}
              onChange={(value) =>
                updateFilters({ updatedFrom: value || null })
              }
            />

            <DateFilter
              label="Updated to"
              value={currentParams.get("updatedTo") ?? ""}
              onChange={(value) => updateFilters({ updatedTo: value || null })}
            />

            <FilterSelect
              label="Trend grouped by"
              value={currentParams.get("dateField") ?? "createdAt"}
              onChange={(value) => updateFilters({ dateField: value })}
            >
              <option value="createdAt">Created date</option>
              <option value="updatedAt">Updated date</option>
            </FilterSelect>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-muted-foreground">
              Quick date range:
            </span>

            <button
              type="button"
              onClick={() => setLastDays(7)}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Last 7 days
            </button>

            <button
              type="button"
              onClick={() => setLastDays(30)}
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Last 30 days
            </button>

            <button
              type="button"
              onClick={() =>
                updateFilters({
                  createdFrom: null,
                  createdTo: null,
                  updatedFrom: null,
                  updatedTo: null,
                })
              }
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Clear dates
            </button>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={currentParams.get("unassigned") === "true"}
                onChange={(event) =>
                  updateFilters({
                    unassigned: event.target.checked,
                    assigneeId: null,
                  })
                }
                className="size-4"
              />
              Unassigned tickets
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={currentParams.get("unassignedTeam") === "true"}
                onChange={(event) =>
                  updateFilters({
                    unassignedTeam: event.target.checked,
                    teamId: null,
                  })
                }
                className="size-4"
              />
              No team assigned
            </label>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={currentParams.get("slaBreached") === "true"}
                onChange={(event) =>
                  updateFilters({ slaBreached: event.target.checked })
                }
                className="size-4"
              />
              SLA breached
            </label>

            <button
              type="button"
              onClick={() =>
                router.replace("/reports/ticket-library", {
                  scroll: false,
                })
              }
              className="ml-auto rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Reset all filters
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          title="Filtered result count"
          value={report.filteredCount}
          href={allTicketsHref}
          description="All tickets matching the current filters"
        />

        <MetricCard
          title="Unassigned tickets"
          value={report.unassignedCount}
          href={buildTicketLibraryReportDrilldownUrl(currentParams, {
            unassigned: true,
            assigneeId: null,
          })}
          description="Tickets in the current cohort without an individual assignee"
        />

        <MetricCard
          title="Saved filters"
          value={report.savedFilters.length}
          href="#saved-filter-analytics"
          description="Your saved filters in this organization"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <BreakdownCard
          title="Tickets by status"
          rows={report.byStatus}
          hrefForRow={(row) =>
            buildTicketLibraryReportDrilldownUrl(currentParams, {
              status: row.id,
            })
          }
        />

        <BreakdownCard
          title="Tickets by priority"
          rows={report.byPriority}
          hrefForRow={(row) =>
            buildTicketLibraryReportDrilldownUrl(currentParams, {
              priority: row.id,
            })
          }
        />

        <BreakdownCard
          title="Tickets by team"
          rows={report.byTeam}
          hrefForRow={(row) =>
            buildTicketLibraryReportDrilldownUrl(currentParams, {
              teamId: row.id,
              unassignedTeam: row.id === null ? true : null,
            })
          }
        />

        <BreakdownCard
          title="Tickets by employee"
          rows={report.byEmployee}
          hrefForRow={(row) =>
            buildTicketLibraryReportDrilldownUrl(currentParams, {
              assigneeId: row.id,
              unassigned: row.id === null ? true : null,
            })
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tickets by date</CardTitle>
          <p className="text-sm text-muted-foreground">
            Daily ticket counts based on the selected trend date field.
          </p>
        </CardHeader>

        <CardContent>
          {report.byDate.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No date data for the selected filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Tickets</th>
                    <th className="py-2 font-medium">Drill-down</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byDate.map((row) => {
                    const dateFilters =
                      reportQuery.data?.meta.dateField === "updatedAt"
                        ? {
                            updatedFrom: row.date,
                            updatedTo: row.date,
                          }
                        : {
                            createdFrom: row.date,
                            createdTo: row.date,
                          };

                    const href = buildTicketLibraryReportDrilldownUrl(
                      currentParams,
                      dateFilters,
                    );

                    return (
                      <tr key={row.date} className="border-b last:border-0">
                        <td className="py-3 pr-4">{row.date}</td>
                        <td className="py-3 pr-4 tabular-nums">
                          {formatCount(row.count)}
                        </td>
                        <td className="py-3">
                          <Link
                            href={href}
                            className="font-medium text-primary hover:underline"
                          >
                            View tickets
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card id="saved-filter-analytics">
        <CardHeader>
          <CardTitle>Saved-filter analytics</CardTitle>
          <p className="text-sm text-muted-foreground">
            Counts use each saved filter&apos;s own criteria, independently of
            the current report filters.
          </p>
        </CardHeader>

        <CardContent>
          {report.savedFilters.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No saved filters are available for this user in this organization.
            </p>
          ) : (
            <div className="space-y-3">
              {report.savedFilters.map((savedFilter) => (
                <div
                  key={savedFilter.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{savedFilter.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Updated{" "}
                      {new Date(savedFilter.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="font-semibold tabular-nums">
                      {formatCount(savedFilter.count)} tickets
                    </span>
                    <Link
                      href={buildSavedFilterUrl(savedFilter.filters)}
                      className="shrink-0 text-sm font-medium text-primary hover:underline"
                    >
                      Open tickets
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function TicketLibraryReport() {
  return (
    <Suspense
      fallback={<LoadingState label="Loading Ticket Library report..." />}
    >
      <TicketLibraryReportContent />
    </Suspense>
  );
}
