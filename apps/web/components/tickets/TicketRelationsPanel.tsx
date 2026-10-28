"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Trash2 } from "lucide-react";

import { EmptyState, ErrorState, LoadingState } from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui";
import {
  useTicketRelations,
  ticketRelationQueryKeys,
} from "@/hooks/use-ticket-relations";
import { useTickets } from "@/hooks/use-tickets";
import { createTicketRelation, deleteTicketRelation } from "@/lib/api/tickets";
import type { OrganizationRole } from "@/types/members";
import type { Ticket, TicketRelationType } from "@/types/tickets";

const RELATION_LABELS: Record<
  TicketRelationType,
  { outgoing: string; incoming: string }
> = {
  RELATED: {
    outgoing: "Related to",
    incoming: "Related by",
  },
  DUPLICATE: {
    outgoing: "Duplicate of",
    incoming: "Duplicated by",
  },
  PARENT: {
    outgoing: "Parent of",
    incoming: "Child of",
  },
  BLOCKS: {
    outgoing: "Blocks",
    incoming: "Blocked by",
  },
};

const RELATION_TYPES: TicketRelationType[] = [
  "RELATED",
  "DUPLICATE",
  "PARENT",
  "BLOCKS",
];

function formatDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function displayEnum(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function errorText(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function TicketRelationsPanel({
  organizationId,
  ticket,
  role,
}: {
  organizationId: string;
  ticket: Ticket;
  role: OrganizationRole;
}) {
  const queryClient = useQueryClient();

  const canManage = role === "OWNER" || role === "ADMIN" || role === "AGENT";

  const relationsQuery = useTicketRelations(organizationId, ticket.id);

  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [relatedTicketId, setRelatedTicketId] = useState("");
  const [relationType, setRelationType] =
    useState<TicketRelationType>("RELATED");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(searchText.trim());
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchText]);

  // Reuse the existing organization-scoped ticket list/API client.
  const ticketSearchQuery = useTickets(
    organizationId,
    {
      search: debouncedSearch,
      page: 1,
      limit: 8,
    },
    {
      enabled: canManage && debouncedSearch.length >= 2,
    },
  );

  const createMutation = useMutation({
    mutationFn: () => {
      if (!relatedTicketId) {
        throw new Error("Select a ticket to relate.");
      }

      return createTicketRelation(organizationId, ticket.id, {
        relatedTicketId,
        type: relationType,
      });
    },
    onSuccess: async () => {
      setRelatedTicketId("");
      setSearchText("");
      setDebouncedSearch("");
      setRelationType("RELATED");
      setNotice("Ticket relationship created.");

      await queryClient.invalidateQueries({
        queryKey: ticketRelationQueryKeys.list(organizationId, ticket.id),
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (relationId: string) =>
      deleteTicketRelation(organizationId, ticket.id, relationId),
    onSuccess: async () => {
      setNotice("Ticket relationship removed.");

      await queryClient.invalidateQueries({
        queryKey: ticketRelationQueryKeys.list(organizationId, ticket.id),
      });
    },
  });

  const relations = relationsQuery.data ?? [];
  const matchingTickets = (ticketSearchQuery.data?.data ?? []).filter(
    (candidate) => candidate.id !== ticket.id,
  );
  const searchIsCurrent = searchText.trim() === debouncedSearch;

  function handleSearchChange(value: string) {
    setSearchText(value);
    setRelatedTicketId("");
    setNotice("");
  }

  function handleDelete(relationId: string, ticketNumber: string) {
    if (!canManage || deleteMutation.isPending) return;

    const confirmed = window.confirm(
      `Remove the relationship with ${ticketNumber}?`,
    );

    if (confirmed) {
      setNotice("");
      deleteMutation.mutate(relationId);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-6 p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-brand-soft text-brand-soft-foreground">
            <Link2 className="size-5" aria-hidden="true" />
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-semibold">Related tickets</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Track tickets associated with this ticket. Relationship changes
              are checked by the API.
            </p>
          </div>
        </div>

        {notice && (
          <p
            className="rounded-xl border border-success-border bg-success-bg/70 px-4 py-3 text-sm text-success"
            role="status"
            aria-live="polite"
          >
            {notice}
          </p>
        )}

        {relationsQuery.isLoading && (
          <LoadingState
            variant="compact"
            label="Loading ticket relationships..."
          />
        )}

        {relationsQuery.isError && (
          <ErrorState
            variant="compact"
            title="Unable to load relationships"
            description={errorText(
              relationsQuery.error,
              "Ticket relationships could not be loaded.",
            )}
            onRetry={() => void relationsQuery.refetch()}
          />
        )}

        {relationsQuery.isSuccess && relations.length === 0 && (
          <EmptyState
            variant="compact"
            icon={Link2}
            title="No related tickets"
            description="Related tickets will appear here once a relationship is created."
          />
        )}

        {relationsQuery.isSuccess && relations.length > 0 && (
          <ul className="divide-y divide-border/70">
            {relations.map((relation) => {
              const label =
                RELATION_LABELS[relation.type][
                  relation.direction === "OUTGOING" ? "outgoing" : "incoming"
                ];

              return (
                <li
                  key={relation.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{label}</Badge>
                      <Badge variant="outline">
                        {displayEnum(relation.ticket.status)}
                      </Badge>
                      <Badge variant="outline">
                        {displayEnum(relation.ticket.priority)}
                      </Badge>
                    </div>

                    <Link
                      href={`/tickets/${encodeURIComponent(relation.ticket.id)}`}
                      className="mt-2 inline-flex max-w-full flex-wrap items-baseline gap-x-2 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span>{relation.ticket.ticketNumber}</span>
                      <span className="break-words text-foreground">
                        {relation.ticket.title}
                      </span>
                    </Link>

                    <p className="mt-1 text-xs text-muted-foreground">
                      Relationship added {formatDate(relation.createdAt)}
                    </p>

                    {relation.direction === "INCOMING" && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        This relationship was created from the other ticket.
                        Open that ticket to remove it.
                      </p>
                    )}
                  </div>

                  {canManage && relation.direction === "OUTGOING" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(relation.id, relation.ticket.ticketNumber)
                      }
                      disabled={deleteMutation.isPending}
                      aria-label={`Remove relationship with ${relation.ticket.ticketNumber}`}
                      className="inline-flex h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-border bg-card px-3.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {deleteMutation.isError && (
          <ErrorState
            variant="compact"
            title="Unable to remove relationship"
            description={errorText(
              deleteMutation.error,
              "The relationship could not be removed.",
            )}
            onRetry={() => {
              const relationId = deleteMutation.variables;
              if (relationId) deleteMutation.mutate(relationId);
            }}
          />
        )}

        {canManage && (
          <section className="space-y-4 border-t border-border/70 pt-6">
            <div>
              <h3 className="text-sm font-semibold">Add a relationship</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Search for another ticket by ticket number or title.
              </p>
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                setNotice("");
                createMutation.mutate();
              }}
            >
              <div className="space-y-1.5">
                <label
                  htmlFor={`relation-ticket-search-${ticket.id}`}
                  className="text-sm font-medium"
                >
                  Find a ticket
                </label>
                <input
                  id={`relation-ticket-search-${ticket.id}`}
                  type="search"
                  autoComplete="off"
                  value={searchText}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  maxLength={100}
                  placeholder="Enter at least 2 characters..."
                  aria-describedby={`relation-search-help-${ticket.id}`}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={createMutation.isPending}
                />
                <p
                  id={`relation-search-help-${ticket.id}`}
                  className="text-xs text-muted-foreground"
                >
                  The current ticket will not appear in the results.
                </p>
              </div>

              {debouncedSearch.length >= 2 &&
                searchIsCurrent &&
                ticketSearchQuery.isLoading && (
                  <LoadingState
                    variant="compact"
                    label="Searching tickets..."
                  />
                )}

              {debouncedSearch.length >= 2 &&
                searchIsCurrent &&
                ticketSearchQuery.isError && (
                  <ErrorState
                    variant="compact"
                    title="Unable to search tickets"
                    description={errorText(
                      ticketSearchQuery.error,
                      "Ticket search failed.",
                    )}
                    onRetry={() => void ticketSearchQuery.refetch()}
                  />
                )}

              {debouncedSearch.length < 2 && (
                <p className="text-xs text-muted-foreground">
                  Enter at least 2 characters to search.
                </p>
              )}

              {debouncedSearch.length >= 2 &&
                searchIsCurrent &&
                ticketSearchQuery.isSuccess &&
                matchingTickets.length === 0 && (
                  <EmptyState
                    variant="compact"
                    icon={Link2}
                    title="No matching tickets"
                    description="Try another ticket number or title."
                  />
                )}

              {debouncedSearch.length >= 2 &&
                searchIsCurrent &&
                ticketSearchQuery.isSuccess &&
                matchingTickets.length > 0 && (
                  <div className="space-y-1.5">
                    <label
                      htmlFor={`related-ticket-${ticket.id}`}
                      className="text-sm font-medium"
                    >
                      Choose a ticket
                    </label>
                    <select
                      id={`related-ticket-${ticket.id}`}
                      required
                      value={relatedTicketId}
                      onChange={(event) =>
                        setRelatedTicketId(event.target.value)
                      }
                      disabled={createMutation.isPending}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Select a ticket</option>
                      {matchingTickets.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.ticketNumber} — {candidate.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

              <div className="space-y-1.5">
                <label
                  htmlFor={`relation-type-${ticket.id}`}
                  className="text-sm font-medium"
                >
                  Relationship type
                </label>
                <select
                  id={`relation-type-${ticket.id}`}
                  value={relationType}
                  onChange={(event) =>
                    setRelationType(event.target.value as TicketRelationType)
                  }
                  disabled={createMutation.isPending}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {RELATION_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {displayEnum(type)}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  !relatedTicketId ||
                  !searchIsCurrent
                }
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
              >
                {createMutation.isPending
                  ? "Adding relationship..."
                  : "Add relationship"}
              </button>
            </form>

            {createMutation.isError && (
              <ErrorState
                variant="compact"
                title="Unable to create relationship"
                description={errorText(
                  createMutation.error,
                  "The relationship could not be created.",
                )}
                onRetry={() => createMutation.mutate()}
              />
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
