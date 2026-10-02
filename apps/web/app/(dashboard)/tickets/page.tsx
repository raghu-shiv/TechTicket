"use client";

import Link from "next/link";
import {
  Inbox,
  Ticket as TicketIcon,
  UserRound,
  UsersRound,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { useOrganizations } from "@/hooks/use-organizations";
import { useTickets } from "@/hooks/use-tickets";
import type { Ticket, TicketPriority, TicketStatus } from "@/types/tickets";

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
  OPEN: {
    label: "Open",
    variant: "info",
  },
  IN_PROGRESS: {
    label: "In Progress",
    variant: "warning",
  },
  PENDING: {
    label: "Pending",
    variant: "secondary",
  },
  RESOLVED: {
    label: "Resolved",
    variant: "success",
  },
  CLOSED: {
    label: "Closed",
    variant: "outline",
  },
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
  LOW: {
    label: "Low",
    variant: "outline",
  },
  MEDIUM: {
    label: "Medium",
    variant: "secondary",
  },
  HIGH: {
    label: "High",
    variant: "warning",
  },
  URGENT: {
    label: "Urgent",
    variant: "danger",
  },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function TicketRow({ ticket }: { ticket: Ticket }) {
  const status = statusConfig[ticket.status];
  const priority = priorityConfig[ticket.priority];

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="block border-b last:border-b-0 transition-colors hover:bg-muted/40"
    >
      <div className="grid gap-4 px-5 py-4 lg:grid-cols-[minmax(220px,1.5fr)_140px_120px_180px_140px] lg:items-center">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-muted-foreground">
              {ticket.ticketNumber}
            </span>
          </div>

          <p className="mt-1 truncate text-sm font-medium">{ticket.title}</p>

          <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
            {ticket.description}
          </p>
        </div>

        <div>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div>
          <Badge variant={priority.variant}>{priority.label}</Badge>
        </div>

        <div className="min-w-0">
          {ticket.assignee ? (
            <div className="flex min-w-0 items-center gap-2">
              <UserRound className="size-4 shrink-0 text-muted-foreground" />

              <div className="min-w-0">
                <p className="truncate text-sm">{ticket.assignee.name}</p>

                <p className="truncate text-xs text-muted-foreground">
                  {ticket.assignee.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserRound className="size-4" />
              <span>Unassigned</span>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          {formatDate(ticket.updatedAt)}
        </div>
      </div>
    </Link>
  );
}

function TicketTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="hidden border-b bg-muted/30 lg:grid lg:grid-cols-[minmax(220px,1.5fr)_140px_120px_180px_140px] lg:items-center lg:gap-4 px-5 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ticket
        </span>

        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Status
        </span>

        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Priority
        </span>

        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Assignee
        </span>

        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Updated
        </span>
      </div>

      <CardContent className="p-0">
        {tickets.map((ticket) => (
          <TicketRow key={ticket.id} ticket={ticket} />
        ))}
      </CardContent>
    </Card>
  );
}

export default function TicketsPage() {
  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const ticketsQuery = useTickets(organizationId, {
    page: 1,
    limit: 20,
    sortBy: "createdAt",
    sortOrder: "desc",
  });

  if (organizationsQuery.isLoading) {
    return <LoadingState label="Loading workspace..." />;
  }

  if (organizationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load workspace"
        description={
          organizationsQuery.error instanceof Error
            ? organizationsQuery.error.message
            : "We couldn't determine your workspace."
        }
        onRetry={() => organizationsQuery.refetch()}
      />
    );
  }

  if (!organizationId) {
    return (
      <div>
        <PageHeader
          title="My Tickets"
          description="View and manage tickets in your workspace."
        />

        <EmptyState
          icon={UsersRound}
          title="No organization available"
          description="Your account is not currently associated with an organization."
        />
      </div>
    );
  }

  if (ticketsQuery.isLoading) {
    return <LoadingState label="Loading tickets..." />;
  }

  if (ticketsQuery.isError) {
    return (
      <div>
        <PageHeader
          title="My Tickets"
          description="View and manage tickets in your workspace."
        />

        <ErrorState
          title="Unable to load tickets"
          description={
            ticketsQuery.error instanceof Error
              ? ticketsQuery.error.message
              : "We couldn't load the ticket list."
          }
          onRetry={() => ticketsQuery.refetch()}
        />
      </div>
    );
  }

  const tickets = ticketsQuery.data?.data ?? [];

  return (
    <div>
      <PageHeader
        title="My Tickets"
        description="View and manage tickets in your workspace."
      />

      {tickets.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No tickets found"
          description="There are no tickets available in this workspace yet."
        />
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TicketIcon className="size-4" />

            <span>
              {ticketsQuery.data?.meta.total ?? tickets.length} tickets
            </span>
          </div>

          <TicketTable tickets={tickets} />
        </div>
      )}
    </div>
  );
}
