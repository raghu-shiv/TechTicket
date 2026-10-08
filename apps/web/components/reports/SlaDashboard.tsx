"use client";

import Link from "next/link";

import { AlertTriangle, Clock3, Timer, XCircle } from "lucide-react";

import { useState } from "react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  StatCard,
} from "@/components/shared";

import { useOrganizations } from "@/hooks/use-organizations";

import { useSlaDashboard } from "@/hooks/use-sla-dashboard";

import type { SlaDashboardView } from "@/types/sla-dashboard";

const views: Array<{
  value: SlaDashboardView;

  label: string;
}> = [
  {
    value: "ALL",

    label: "All",
  },

  {
    value: "ACTIVE",

    label: "Active",
  },

  {
    value: "AT_RISK",

    label: "At Risk",
  },

  {
    value: "BREACHED",

    label: "Breached",
  },

  {
    value: "FIRST_RESPONSE_BREACHED",

    label: "First Response Breached",
  },

  {
    value: "RESOLUTION_BREACHED",

    label: "Resolution Breached",
  },

  {
    value: "RESOLVED",

    label: "Resolved",
  },
];

function formatRate(rate: number | null) {
  if (rate === null) {
    return "—";
  }

  return `${rate.toFixed(1)}%`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",

    timeStyle: "short",
  }).format(new Date(value));
}

function getTicketSlaState(ticket: {
  resolvedAt: string | null;

  firstResponseBreachedAt: string | null;

  resolutionBreachedAt: string | null;

  firstResponseDueAt: string;

  resolutionDueAt: string;
}) {
  if (ticket.firstResponseBreachedAt || ticket.resolutionBreachedAt) {
    return "Breached";
  }

  if (ticket.resolvedAt) {
    return "Resolved";
  }

  const now = Date.now();

  const firstResponseWarning =
    !ticket.firstResponseBreachedAt &&
    !ticket.resolvedAt &&
    new Date(ticket.firstResponseDueAt).getTime() > now;

  const resolutionWarning =
    !ticket.resolvedAt && new Date(ticket.resolutionDueAt).getTime() > now;

  if (firstResponseWarning || resolutionWarning) {
    return "At Risk";
  }

  return "Active";
}

export function SlaDashboard() {
  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const [view, setView] = useState<SlaDashboardView>("ALL");

  const [page, setPage] = useState(1);

  const dashboardQuery = useSlaDashboard(organizationId, {
    view,

    page,

    limit: 25,
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
        icon={Clock3}
        title="No organization available"
        description="Your account is not associated with an organization."
      />
    );
  }

  if (dashboardQuery.isLoading) {
    return <LoadingState label="Loading SLA dashboard..." />;
  }

  if (dashboardQuery.isError) {
    return (
      <ErrorState
        title="Unable to load SLA dashboard"
        description={
          dashboardQuery.error instanceof Error
            ? dashboardQuery.error.message
            : "We couldn't load SLA metrics."
        }
        onRetry={() => dashboardQuery.refetch()}
      />
    );
  }

  const result = dashboardQuery.data;

  if (!result) {
    return (
      <EmptyState
        icon={Clock3}
        title="No SLA data"
        description="No SLA dashboard data is available."
      />
    );
  }

  const metrics = result.data.metrics;

  return (
    <div className="space-y-6">
      <section
        aria-label="SLA overview"
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        <StatCard
          title="SLA Tickets"
          value={String(metrics.total)}
          description="Tickets with SLA snapshots"
          icon={Timer}
        />

        <StatCard
          title="Active"
          value={String(metrics.active)}
          description="Running within SLA"
          icon={Clock3}
        />

        <StatCard
          title="At Risk"
          value={String(metrics.atRisk)}
          description="Inside the warning window"
          icon={AlertTriangle}
        />

        <StatCard
          title="Breached"
          value={String(metrics.breached)}
          description="First response or resolution"
          icon={XCircle}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>First-response SLA</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Metric
                label="Compliance"
                value={formatRate(metrics.firstResponse.complianceRate)}
              />

              <Metric
                label="Completed"
                value={String(metrics.firstResponse.completed)}
              />

              <Metric
                label="Breached"
                value={String(metrics.firstResponse.breached)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resolution SLA</CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <Metric
                label="Compliance"
                value={formatRate(metrics.resolution.complianceRate)}
              />

              <Metric
                label="Resolved"
                value={String(metrics.resolution.completed)}
              />

              <Metric
                label="Breached"
                value={String(metrics.resolution.breached)}
              />
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>SLA tickets</CardTitle>

            <div className="flex flex-wrap gap-2">
              {views.map((item) => (
                <Button
                  key={item.value}
                  size="sm"
                  variant={view === item.value ? "default" : "outline"}
                  onClick={() => {
                    setView(item.value);

                    setPage(1);
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {result.data.tickets.length === 0 ? (
            <EmptyState
              icon={Clock3}
              title="No SLA tickets"
              description="No tickets match the selected SLA view."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="px-3 py-3 font-medium">Ticket</th>

                      <th className="px-3 py-3 font-medium">Priority</th>

                      <th className="px-3 py-3 font-medium">Assignee</th>

                      <th className="px-3 py-3 font-medium">SLA</th>

                      <th className="px-3 py-3 font-medium">Created</th>

                      <th className="px-3 py-3" />
                    </tr>
                  </thead>

                  <tbody>
                    {result.data.tickets.map((ticket) => {
                      const state = getTicketSlaState({
                        resolvedAt: ticket.resolvedAt,

                        firstResponseBreachedAt:
                          ticket.firstResponse.breachedAt,

                        resolutionBreachedAt: ticket.resolution.breachedAt,

                        firstResponseDueAt: ticket.firstResponse.dueAt,

                        resolutionDueAt: ticket.resolution.dueAt,
                      });

                      return (
                        <tr key={ticket.id} className="border-b last:border-0">
                          <td className="px-3 py-4">
                            <div>
                              <p className="font-medium">
                                {ticket.ticketNumber}
                              </p>

                              <p className="max-w-xs truncate text-muted-foreground">
                                {ticket.title}
                              </p>
                            </div>
                          </td>

                          <td className="px-3 py-4">
                            <Badge variant="secondary">{ticket.priority}</Badge>
                          </td>

                          <td className="px-3 py-4">
                            {ticket.assignee?.name ?? "Unassigned"}
                          </td>

                          <td className="px-3 py-4">
                            <Badge
                              variant={
                                state === "Breached"
                                  ? "danger"
                                  : state === "At Risk"
                                    ? "warning"
                                    : state === "Resolved"
                                      ? "success"
                                      : "secondary"
                              }
                            >
                              {state}
                            </Badge>
                          </td>

                          <td className="px-3 py-4 text-muted-foreground">
                            {formatDate(ticket.createdAt)}
                          </td>

                          <td className="px-3 py-4 text-right">
                            <Link
                              href={`/tickets/${ticket.id}`}
                              className="text-sm font-medium underline-offset-4 hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex items-center justify-between border-t pt-4">
                <p className="text-sm text-muted-foreground">
                  Page {result.meta.page} of {result.meta.totalPages || 1}
                </p>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Previous
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= result.meta.totalPages}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
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
