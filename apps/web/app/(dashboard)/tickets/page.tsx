"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Filter,
  Inbox,
  RotateCcw,
  Search,
  Ticket as TicketIcon,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui";
import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { SavedFiltersPanel } from "@/components/tickets/SavedFiltersPanel";
import { savedFilterToSearchParams } from "@/lib/saved-filters";
import { useOrganizations } from "@/hooks/use-organizations";
import { useTickets } from "@/hooks/use-tickets";
import type {
  Ticket,
  TicketPriority,
  TicketSortField,
  TicketStatus,
  TicketType,
} from "@/types/tickets";

const DEFAULT_SORT_BY: TicketSortField = "updatedAt";
const DEFAULT_SORT_ORDER = "desc" as const;
const DEFAULT_PAGE_SIZE = 20;

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
          <span className="text-xs font-medium text-muted-foreground">
            {ticket.ticketNumber}
          </span>

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
    <label className="flex min-w-0 flex-col gap-1.5">
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

function ActiveFilter({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
      aria-label={`Remove ${label} filter`}
    >
      <span>{label}</span>
      <X className="size-3.5 text-muted-foreground" />
    </button>
  );
}

function TicketPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  if (totalPages <= 1) {
    return null;
  }

  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page <span className="font-medium text-foreground">{page}</span> of{" "}
        <span className="font-medium text-foreground">{totalPages}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canGoPrevious}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          <ArrowLeft className="size-4" />
          Previous
        </button>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          Next
          <ArrowRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

function TicketsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  /*
   * --------------------------------------------------------------------------
   * URL STATE
   * --------------------------------------------------------------------------
   *
   * The URL remains the single source of truth for the ticket library.
   *
   * Examples:
   *
   * /tickets
   * /tickets?status=OPEN
   * /tickets?priority=URGENT
   * /tickets?unassigned=true
   * /tickets?search=database
   * /tickets?status=OPEN&priority=HIGH&page=2
   *
   * This makes filters bookmarkable, shareable and refresh-safe.
   */

  const pageParam = searchParams.get("page");

  const page = Math.max(1, Number(pageParam ?? "1") || 1);

  const searchParam = searchParams.get("search") ?? "";
  const statusParam = searchParams.get("status");
  const priorityParam = searchParams.get("priority");
  const typeParam = searchParams.get("type");
  const unassignedParam = searchParams.get("unassigned");
  const sortByParam = searchParams.get("sortBy");
  const sortOrderParam = searchParams.get("sortOrder");

  /*
   * --------------------------------------------------------------------------
   * NORMALIZED FILTER STATE
   * --------------------------------------------------------------------------
   */

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
    DEFAULT_SORT_BY,
  );

  const sortOrder = getInitialValue(
    sortOrderParam,
    ["asc", "desc"] as const,
    DEFAULT_SORT_ORDER,
  );

  const unassigned = unassignedParam === "true";

  /*
   * --------------------------------------------------------------------------
   * URL UPDATE HELPER
   * --------------------------------------------------------------------------
   */

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

      /*
       * Any filter/sort change starts from page one.
       *
       * Pagination itself calls this helper with resetPage=false.
       */
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

  /*
   * --------------------------------------------------------------------------
   * FILTER HANDLERS
   * --------------------------------------------------------------------------
   */

  const handleSearchChange = (value: string) => {
    updateUrl({
      search: value.trim() || null,
    });
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

  /*
   * --------------------------------------------------------------------------
   * CLEAR FILTERS
   * --------------------------------------------------------------------------
   *
   * Search/status/priority/type/unassigned are cleared.
   *
   * Sorting remains at the useful default:
   * updatedAt DESC
   */

  const clearFilters = () => {
    const params = new URLSearchParams();

    params.set("sortBy", DEFAULT_SORT_BY);
    params.set("sortOrder", DEFAULT_SORT_ORDER);

    router.replace(`${pathname}?${params.toString()}`, {
      scroll: false,
    });
  };

  /*
   * --------------------------------------------------------------------------
   * PAGINATION
   * --------------------------------------------------------------------------
   */

  const handlePageChange = (nextPage: number) => {
    const totalPages = ticketsQuery.data?.meta.totalPages ?? 1;

    if (nextPage < 1 || nextPage > totalPages || nextPage === page) {
      return;
    }

    const params = new URLSearchParams(searchParams.toString());

    if (nextPage === 1) {
      params.delete("page");
    } else {
      params.set("page", String(nextPage));
    }

    const queryString = params.toString();

    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
  };

  /*
   * --------------------------------------------------------------------------
   * ACTIVE FILTERS
   * --------------------------------------------------------------------------
   */

  const activeFilters = useMemo(() => {
    const filters: Array<{
      key: string;
      label: string;
    }> = [];

    if (searchParam) {
      filters.push({
        key: "search",
        label: `Search: ${searchParam}`,
      });
    }

    if (status) {
      filters.push({
        key: "status",
        label: `Status: ${
          statusOptions.find((option) => option.value === status)?.label ??
          status
        }`,
      });
    }

    if (priority) {
      filters.push({
        key: "priority",
        label: `Priority: ${
          priorityOptions.find((option) => option.value === priority)?.label ??
          priority
        }`,
      });
    }

    if (type) {
      filters.push({
        key: "type",
        label: `Type: ${
          typeOptions.find((option) => option.value === type)?.label ?? type
        }`,
      });
    }

    if (unassigned) {
      filters.push({
        key: "unassigned",
        label: "Unassigned only",
      });
    }

    return filters;
  }, [searchParam, status, priority, type, unassigned]);

  const hasFilters = activeFilters.length > 0;

  /*
   * --------------------------------------------------------------------------
   * API QUERY
   * --------------------------------------------------------------------------
   */

  const ticketParams = useMemo(
    () => ({
      page,
      limit: DEFAULT_PAGE_SIZE,
      search: searchParam || undefined,
      status: status || undefined,
      priority: priority || undefined,
      type: type || undefined,
      unassigned: unassigned || undefined,
      sortBy,
      sortOrder,
    }),
    [page, searchParam, status, priority, type, unassigned, sortBy, sortOrder],
  );

  const ticketsQuery = useTickets(organizationId, ticketParams);

  const tickets = ticketsQuery.data?.data ?? [];

  /*
   * --------------------------------------------------------------------------
   * ORGANIZATION STATES
   * --------------------------------------------------------------------------
   */

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

  /*
   * --------------------------------------------------------------------------
   * PAGE
   * --------------------------------------------------------------------------
   */

  return (
    <div>
      <PageHeader
        title="My Tickets"
        description="View and manage tickets in your workspace."
      />

      <div className="mt-6 space-y-4">
        <SavedFiltersPanel
          organizationId={organizationId}
          searchParams={new URLSearchParams(searchParams.toString())}
          onApply={(savedFilter) => {
            const params = savedFilterToSearchParams(savedFilter.filters);
            const queryString = params.toString();

            router.replace(
              queryString ? `${pathname}?${queryString}` : pathname,
              {
                scroll: false,
              },
            );
          }}
        />
        {/* ------------------------------------------------------------------ */}
        {/* FILTER TOOLBAR                                                     */}
        {/* ------------------------------------------------------------------ */}

        <Card>
          <CardContent className="p-4 sm:p-5">
            <div className="flex flex-col gap-4">
              {/* Toolbar heading */}
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-md bg-muted">
                  <Filter className="size-4 text-muted-foreground" />
                </div>

                <div>
                  <p className="text-sm font-medium">Filter tickets</p>

                  <p className="text-xs text-muted-foreground">
                    Refine the ticket list without leaving the page.
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  type="search"
                  value={searchParam}
                  onChange={(event) => handleSearchChange(event.target.value)}
                  placeholder="Search ticket number, title, or description..."
                  aria-label="Search tickets"
                  className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Select filters */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    Order
                  </span>

                  <button
                    type="button"
                    onClick={toggleSortOrder}
                    className="flex h-9 items-center justify-center gap-2 rounded-md border border-input bg-background px-3 text-sm transition-colors hover:bg-muted"
                    aria-label={
                      "Sort " +
                      (sortOrder === "asc" ? "descending" : "ascending")
                    }
                  >
                    {sortOrder === "asc" ? (
                      <ArrowUp className="size-4" />
                    ) : (
                      <ArrowDown className="size-4" />
                    )}

                    <span>
                      {sortOrder === "asc" ? "Ascending" : "Descending"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Secondary actions */}
              <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
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

              {/* Active filters */}
              {hasFilters && (
                <div
                  className="flex flex-wrap items-center gap-2 border-t pt-4"
                  aria-label="Active filters"
                >
                  <span className="mr-1 text-xs font-medium text-muted-foreground">
                    Active filters:
                  </span>

                  {activeFilters.map((filter) => (
                    <ActiveFilter
                      key={filter.key}
                      label={filter.label}
                      onRemove={() =>
                        updateUrl({
                          [filter.key]: null,
                        })
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ------------------------------------------------------------------ */}
        {/* RESULTS                                                            */}
        {/* ------------------------------------------------------------------ */}

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
            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
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
              <>
                <TicketTable tickets={tickets} />

                <TicketPagination
                  page={ticketsQuery.data?.meta.page ?? page}
                  totalPages={ticketsQuery.data?.meta.totalPages ?? 1}
                  onPageChange={handlePageChange}
                />
              </>
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
