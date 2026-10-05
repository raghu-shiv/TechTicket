"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Inbox,
  Ticket as TicketIcon,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react";
import { use } from "react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui";
import { useOrganizations } from "@/hooks/use-organizations";
import { useTicket } from "@/hooks/use-ticket";
import type { TicketPriority, TicketStatus, TicketType } from "@/types/tickets";
import { TicketSlaPanel } from "@/components/tickets/TicketSlaPanel";

const statusConfig: Record<
  TicketStatus,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "success"
      | "warning"
      | "danger"
      | "info"
      | "outline";
  }
> = {
  OPEN: { label: "Open", variant: "info" },
  IN_PROGRESS: { label: "In Progress", variant: "warning" },
  PENDING: { label: "Pending", variant: "secondary" },
  RESOLVED: { label: "Resolved", variant: "success" },
  CLOSED: { label: "Closed", variant: "outline" },
};

const priorityConfig: Record<
  TicketPriority,
  {
    label: string;
    variant:
      | "default"
      | "secondary"
      | "success"
      | "warning"
      | "danger"
      | "info"
      | "outline";
  }
> = {
  LOW: { label: "Low", variant: "outline" },
  MEDIUM: { label: "Medium", variant: "secondary" },
  HIGH: { label: "High", variant: "warning" },
  URGENT: { label: "Urgent", variant: "danger" },
};

const typeLabels: Record<TicketType, string> = {
  INCIDENT: "Incident",
  SERVICE_REQUEST: "Service Request",
  QUESTION: "Question",
  PROBLEM: "Problem",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const organizationsQuery = useOrganizations();
  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const ticketQuery = useTicket(organizationId, id);

  if (organizationsQuery.isLoading) {
    return <LoadingState />;
  }

  if (organizationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load workspace"
        description={
          organizationsQuery.error instanceof Error
            ? organizationsQuery.error.message
            : "Failed to fetch workspace"
        }
      />
    );
  }

  if (!organizationId) {
    return (
      <EmptyState
        icon={Inbox}
        title="No workspace available"
        description="You are not currently a member of an organization."
      />
    );
  }

  if (ticketQuery.isLoading) {
    return <LoadingState />;
  }

  if (ticketQuery.isError) {
    return (
      <ErrorState
        title="Unable to load ticket"
        description={
          ticketQuery.error instanceof Error
            ? ticketQuery.error.message
            : "Failed to fetch ticket"
        }
      />
    );
  }

  const ticket = ticketQuery.data;

  if (!ticket) {
    return (
      <EmptyState
        icon={TicketIcon}
        title="Ticket not found"
        description="The requested ticket could not be found."
      />
    );
  }

  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];

  return (
    <div className="space-y-6">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to tickets
      </Link>

      <PageHeader title={ticket.title} description={ticket.ticketNumber} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* ------------------------------------------------------------------ */}
        {/* MAIN TICKET CONTENT                                                */}
        {/* ------------------------------------------------------------------ */}

        <Card>
          <CardContent className="space-y-6 p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={status.variant}>{status.label}</Badge>

              <Badge variant={priority.variant}>{priority.label}</Badge>

              <Badge variant="outline">{typeLabels[ticket.type]}</Badge>

              {ticket.sla &&
                (ticket.sla.firstResponseBreachedAt !== null ||
                  ticket.sla.resolutionBreachedAt !== null) && (
                  <Badge variant="danger">
                    <XCircle className="size-3.5" />
                    SLA breached
                  </Badge>
                )}
            </div>

            <div>
              <h2 className="text-sm font-medium">Description</h2>

              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {ticket.description}
              </p>
            </div>

            <div className="grid gap-4 border-t pt-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Created
                </p>

                <p className="mt-1 text-sm">{formatDate(ticket.createdAt)}</p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Updated
                </p>

                <p className="mt-1 text-sm">{formatDate(ticket.updatedAt)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* SLA + TICKET CONTEXT                                               */}
        {/* ------------------------------------------------------------------ */}

        <div className="space-y-6">
          <TicketSlaPanel ticket={ticket} />

          <Card>
            <CardContent className="space-y-5 p-6">
              {/* Requester */}
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Requester
                </p>

                <div className="mt-2 flex items-start gap-3">
                  <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {ticket.requester.name}
                    </p>

                    <p className="truncate text-xs text-muted-foreground">
                      {ticket.requester.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assignee */}
              <div className="border-t pt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Assignee
                </p>

                {ticket.assignee ? (
                  <div className="mt-2 flex items-start gap-3">
                    <UserRound className="mt-0.5 size-4 shrink-0 text-muted-foreground" />

                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {ticket.assignee.name}
                      </p>

                      <p className="truncate text-xs text-muted-foreground">
                        {ticket.assignee.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-3 text-sm text-muted-foreground">
                    <UserRound className="size-4" />
                    <span>Unassigned</span>
                  </div>
                )}
              </div>

              {/* Team */}
              <div className="border-t pt-5">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Team
                </p>

                {ticket.team ? (
                  <div className="mt-2 flex items-center gap-3">
                    <UsersRound className="size-4 shrink-0 text-muted-foreground" />

                    <span className="text-sm">{ticket.team.name}</span>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    No team assigned
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
