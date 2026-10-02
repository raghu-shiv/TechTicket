"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  Inbox,
  RotateCcw,
  Search,
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
import type {
  Ticket,
  TicketPriority,
  TicketSortField,
  TicketStatus,
  TicketType,
} from "@/types/tickets";

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

const statusOptions: Array<{
  value: TicketStatus;
  label: string;
}> = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "PENDING", label: "Pending" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "CLOSED", label: "Closed" },
];

const priorityOptions: Array<{
  value: TicketPriority;
  label: string;
}> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const typeOptions: Array<{
  value: TicketType;
  label: string;
}> = [
  { value: "INCIDENT", label: "Incident" },
  { value: "SERVICE_REQUEST", label: "Service Request" },
  { value: "QUESTION", label: "Question" },
  { value: "PROBLEM", label: "Problem" },
];

const sortOptions: Array<{
  value: TicketSortField;
  label: string;
}> = [
  { value: "createdAt", label: "Created Date" },
  { value: "updatedAt", label: "Updated Date" },
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "title", label: "Title" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getInitialValue<T extends string>(
  value: string | null,
  allowedValues: readonly T[],
  fallback: T,
): T {
  return value && allowedValues.includes(value as T) ? (value as T) : fallback;
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
      <div className="hidden border-b bg-muted/30 px-5 py-3 lg:grid lg:grid-cols-[minmax(220px,1.5fr)_140px_120px_180px_140px] lg:items-center lg:gap-4">
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
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-ring"
      >
        {children}
      </select>
    </label>
  );
}

function TicketsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const searchParam = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status");
  const priorityParam = searchParams.get("priority");
  const typeParam = searchParams.get("type");
  const unassignedParam = searchParams.get("unassigned");
  const sortByParam = searchParams.get("sortBy");
  const sortOrderParam = searchParams.get("sortOrder");

  const status = getInitialValue(
    statusParam,
    statusOptions.map((option) => option.value),
    "",
  );

  const priority = getInitialValue(
    priorityParam,
    priorityOptions.map((option) => option.value),
    "",
  );

  const type = getInitialValue(
    typeParam,
    typeOptions.map((option) => option.value),
    "",
  );

  const sortBy = getInitialValue(
    sortByParam,
    sortOptions.map((option) => option.value),
    "updatedAt",
  );

  const sortOrder = getInitialValue(
    sortOrderParam,
    ["asc", "desc"] as const,
    "desc",
  );

  const unassigned = unassignedParam === "true";

  const updateUrl = useCallback(
    (
      updates: Record<string, string | boolean | null | undefined>,
      resetPage = true,
    ) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === undefined ||
          value === null ||
          value === "" ||
          value === false
        ) {
          params.delete(key);
          return;
        }

        params.set(key, String(value));
      });

      if (resetPage) {
        params.delete("page");
      }

      const queryString = params.toString();

      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const handleSearchChange = (value: string) => {
    updateUrl(
      {
        search: value.trim() || null,
      },
      true,
    );
  };

  const handleStatusChange = (value: string) => {
    updateUrl({
      status: value || null,
    });
  };

  const handlePriorityChange = (value: string) => {
    updateUrl({
      priority: value || null,
    });
  };

  const handleTypeChange = (value: string) => {
    updateUrl({
      type: value || null,
    });
  };

  const handleUnassignedChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    updateUrl({
      unassigned: event.target.checked,
    });
  };

  const handleSortChange = (value: string) => {
    updateUrl({
      sortBy: value,
    });
  };

  const toggleSortOrder = () => {
    updateUrl(
      {
        sortOrder: sortOrder === "asc" ? "desc" : "asc",
      },
      false,
    );
  };

  const clearFilters = () => {
    const params = new URLSearchParams();

    params.set("sortBy", "updatedAt");
    params.set("sortOrder", "desc");

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  const hasFilters =
    Boolean(searchParam) ||
    Boolean(statusParam) ||
    Boolean(priorityParam) ||
    Boolean(typeParam) ||
    unassignedParam === "true";

  const ticketParams = useMemo(
    () => ({
      page: Number(searchParams.get("page") ?? "1"),
      limit: 20,
      search: searchParam || undefined,
      status: status || undefined,
      priority: priority || undefined,
      type: type || undefined,
      unassigned: unassigned || undefined,
      sortBy,
      sortOrder,
    }),
    [
      searchParam,
      status,
      priority,
      type,
      unassigned,
      sortBy,
      sortOrder,
      searchParams,
    ],
  );

  const ticketsQuery = useTickets(organizationId, ticketParams);
  const tickets = ticketsQuery.data?.data ?? [];

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

  return (
    <div>
      <PageHeader
        title="My Tickets"
        description="View and manage tickets in your workspace."
      />

      <div className="mt-6 space-y-4">
        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

              <input
                type="search"
                value={searchParam}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder="Search ticket number, title, or description..."
                className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-col gap-3 md:flex-row">
              <FilterSelect
                label="Status"
                value={status}
                onChange={handleStatusChange}
              >
                <option value="">All statuses</option>

                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Priority"
                value={priority}
                onChange={handlePriorityChange}
              >
                <option value="">All priorities</option>

                {priorityOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Type"
                value={type}
                onChange={handleTypeChange}
              >
                <option value="">All types</option>

                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                label="Sort by"
                value={sortBy}
                onChange={handleSortChange}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </FilterSelect>

              <div className="flex min-w-[120px] flex-col gap-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  Order
                </span>

                <button
                  type="button"
                  onClick={toggleSortOrder}
                  className="flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted"
                  aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                >
                  {sortOrder === "asc" ? (
                    <>
                      <ArrowUp className="size-4" />
                      Ascending
                    </>
                  ) : (
                    <>
                      <ArrowDown className="size-4" />
                      Descending
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Additional filter actions */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={unassigned}
                  onChange={handleUnassignedChange}
                  className="size-4 rounded border-input"
                />

                <span>Unassigned tickets only</span>
              </label>

              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RotateCcw className="size-4" />
                  Clear filters
                </button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {ticketsQuery.isLoading ? (
          <LoadingState label="Loading tickets..." />
        ) : ticketsQuery.isError ? (
          <ErrorState
            title="Unable to load tickets"
            description={
              ticketsQuery.error instanceof Error
                ? ticketsQuery.error.message
                : "We couldn't load the ticket list."
            }
            onRetry={() => ticketsQuery.refetch()}
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <TicketIcon className="size-4" />

                <span>{ticketsQuery.data?.meta.total ?? 0} tickets</span>
              </div>

              {hasFilters && <span>Filtered results</span>}
            </div>

            {tickets.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No tickets found"
                description={
                  hasFilters
                    ? "No tickets match the current filters."
                    : "There are no tickets available in this workspace yet."
                }
              />
            ) : (
              <TicketTable tickets={tickets} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function TicketsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading tickets..." />}>
      <TicketsContent />
    </Suspense>
  );
}
