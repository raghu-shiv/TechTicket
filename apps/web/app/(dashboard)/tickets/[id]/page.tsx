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
import { useSlaRealtime } from "@/hooks/use-sla-realtime";
import type { TicketPriority, TicketStatus, TicketType } from "@/types/tickets";
import { TicketSlaPanel } from "@/components/tickets/TicketSlaPanel";
import { SlaBreachHistory } from "@/components/tickets/SlaBreachHistory";
import { TicketAttachmentsPanel } from "@/components/tickets/TicketAttachmentsPanel";
import { TicketWorkflowPanel } from "@/components/tickets/TicketWorkflowPanel";
import { TicketRelationsPanel } from "@/components/tickets/TicketRelationsPanel";

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
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = use(params);
  const notices = use(searchParams);

  const showCreatedNotice = notices.created === "1";
  const showAttachmentWarning = notices.attachmentUpload === "failed";

  const organizationsQuery = useOrganizations();
  const membership = organizationsQuery.data?.[0];
  const organizationId = membership?.organizationId;

  const ticketQuery = useTicket(organizationId, id);
  useSlaRealtime({
    organizationId,
    ticketId: id,
  });

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
    <div className="space-y-8">
      <div>
        <Link
          href="/tickets"
          className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to tickets
        </Link>

        <div className="mt-4">
          <PageHeader title={ticket.title} description={ticket.ticketNumber} />
        </div>
      </div>

      {showCreatedNotice && (
        <div
          className="flex items-start gap-3 rounded-xl border border-success-border bg-success-bg/70 px-4 py-3 text-sm text-success"
          role="status"
        >
          <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success/10">
            <span
              className="size-2 rounded-full bg-success"
              aria-hidden="true"
            />
          </span>
          <p>Ticket {ticket.ticketNumber} was created successfully.</p>
        </div>
      )}

      {showAttachmentWarning && (
        <div
          className="flex items-start gap-3 rounded-xl border border-warning-border bg-warning-bg/60 px-4 py-3 text-sm text-warning"
          role="alert"
        >
          <XCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            The ticket was created, but one or more attachments could not be
            uploaded. Do not create another ticket for this issue. The failed
            uploads need to be retried separately.
          </p>
        </div>
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Main ticket summary */}
        <Card className="h-full overflow-hidden border-border/80 shadow-card">
          <CardContent className="space-y-7 p-5 sm:p-7">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                Ticket overview
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={status.variant}>{status.label}</Badge>
                <Badge variant={priority.variant}>{priority.label}</Badge>
                <Badge variant="outline">{typeLabels[ticket.type]}</Badge>

                {ticket.sla &&
                  (ticket.sla.firstResponseBreachedAt !== null ||
                    ticket.sla.resolutionBreachedAt !== null) && (
                    <Badge variant="danger">
                      <XCircle className="size-3.5" aria-hidden="true" />
                      SLA breached
                    </Badge>
                  )}
              </div>
            </div>

            <section className="rounded-xl border border-border/70 bg-surface-muted/40 p-4 sm:p-5">
              <h2 className="text-sm font-semibold text-foreground">
                Description
              </h2>

              <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-muted-foreground">
                {ticket.description}
              </p>
            </section>

            <div className="grid gap-4 border-t border-border/70 pt-6 sm:grid-cols-2">
              <div className="rounded-xl border border-border/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Created
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatDate(ticket.createdAt)}
                </p>
              </div>

              <div className="rounded-xl border border-border/70 p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Last updated
                </p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  {formatDate(ticket.updatedAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SLA and ownership context */}
        <aside className="min-w-0 space-y-5">
          <TicketSlaPanel ticket={ticket} />

          <Card className="overflow-hidden border-border/80 shadow-card">
            <CardContent className="space-y-5 p-5 sm:p-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Requester
                </p>

                <div className="mt-3 flex min-w-0 items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-muted">
                    <UserRound
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </span>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {ticket.requester.name}
                    </p>
                    <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                      {ticket.requester.email}
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border/70 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Assignee
                </p>

                {ticket.assignee ? (
                  <div className="mt-3 flex min-w-0 items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-muted">
                      <UserRound
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {ticket.assignee.name}
                      </p>
                      <p className="mt-1 break-words text-xs leading-5 text-muted-foreground">
                        {ticket.assignee.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex items-center gap-3 rounded-xl border border-dashed border-border/80 bg-surface-muted/30 p-3 text-sm text-muted-foreground">
                    <UserRound className="size-4 shrink-0" aria-hidden="true" />
                    <span>Unassigned</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border/70 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  Team
                </p>

                {ticket.team ? (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-surface-muted">
                      <UsersRound
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    </span>
                    <span className="text-sm font-medium text-foreground">
                      {ticket.team.name}
                    </span>
                  </div>
                ) : (
                  <p className="mt-3 rounded-xl border border-dashed border-border/80 bg-surface-muted/30 p-3 text-sm text-muted-foreground">
                    No team assigned
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Preserve existing workflow, relation and attachment components */}
      <TicketWorkflowPanel
        key={`workflow-${ticket.id}`}
        organizationId={organizationId}
        ticket={ticket}
        currentUserId={membership?.userId ?? ""}
        role={membership?.role ?? "REQUESTER"}
      />

      <TicketRelationsPanel
        key={`relations-${ticket.id}`}
        organizationId={organizationId}
        ticket={ticket}
        role={membership?.role ?? "REQUESTER"}
      />

      <TicketAttachmentsPanel
        key={`attachments-${ticket.id}`}
        organizationId={organizationId}
        ticketId={ticket.id}
        canDelete={
          membership?.role === "OWNER" ||
          membership?.role === "ADMIN" ||
          membership?.role === "AGENT"
        }
      />

      <SlaBreachHistory organizationId={organizationId} ticketId={ticket.id} />
    </div>
  );
}
