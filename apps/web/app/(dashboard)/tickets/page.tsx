"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { SlaIndicator } from "@/components/tickets/SlaIndicator";
import { savedFilterToSearchParams } from "@/lib/saved-filters";
import { getProductIdFromTicketLibrarySearchParams } from "@/lib/product-drilldown";
import { getProducts } from "@/lib/api/products";
import { useOrganizations } from "@/hooks/use-organizations";
import { useTickets } from "@/hooks/use-tickets";
import { useSlaRealtime } from "@/hooks/use-sla-realtime";
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

  const assigneeInitials = ticket.assignee
    ? ticket.assignee.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "";

  return (
    <Link
      href={`/tickets/${ticket.id}`}
      className="group block border-b border-border/70 transition-colors last:border-b-0 hover:bg-surface-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
    >
      <div className="grid gap-4 px-4 py-4 sm:px-5 sm:py-5 lg:grid-cols-[minmax(220px,1.6fr)_125px_155px_180px_130px] lg:items-center lg:gap-5">
        <div className="min-w-0">
          <span className="inline-flex max-w-full items-center rounded-md border border-border/70 bg-surface-muted px-2 py-1 font-mono text-[11px] font-semibold tracking-wide text-muted-foreground">
            {ticket.ticketNumber}
          </span>

          <p className="mt-2 truncate text-sm font-semibold text-card-foreground transition-colors group-hover:text-primary">
            {ticket.title}
          </p>

          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
            {ticket.description}
          </p>
        </div>

        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">
            Status
          </span>
          <Badge variant={status.variant}>{status.label}</Badge>
        </div>

        <div className="min-w-0 space-y-2">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">
            Priority / SLA
          </span>

          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant={priority.variant}>{priority.label}</Badge>
          </div>

          <div className="min-w-0">
            <SlaIndicator ticket={ticket} />
          </div>
        </div>

        <div className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">
            Assignee
          </span>

          {ticket.assignee ? (
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-surface-muted text-[10px] font-bold text-muted-foreground"
                aria-hidden="true"
              >
                {assigneeInitials}
              </span>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {ticket.assignee.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {ticket.assignee.email}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-dashed border-border bg-surface-muted">
                <UserRound className="size-4" aria-hidden="true" />
              </span>
              <span>Unassigned</span>
            </div>
          )}
        </div>

        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground lg:hidden">
            Updated
          </span>
          <time dateTime={ticket.updatedAt}>
            {formatDate(ticket.updatedAt)}
          </time>
        </div>
      </div>
    </Link>
  );
}

function TicketTable({ tickets }: { tickets: Ticket[] }) {
  return (
    <Card className="overflow-hidden border-border/80 shadow-card">
      <div className="hidden border-b border-border/80 bg-surface-muted/70 px-5 py-3 lg:grid lg:grid-cols-[minmax(220px,1.6fr)_125px_155px_180px_130px] lg:items-center lg:gap-5">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Ticket
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Status
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Priority / SLA
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          Assignee
        </span>
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
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
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-semibold text-foreground">{label}</span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-sm transition-[border-color,background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
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
      className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-primary/20 bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-soft-foreground transition-colors hover:border-primary/40 hover:bg-brand-soft/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      aria-label={`Remove ${label} filter`}
    >
      <span className="min-w-0 break-words">{label}</span>
      <X className="size-3.5 shrink-0" aria-hidden="true" />
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

  const buttonClassName =
    "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3.5 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-40";

  return (
    <div className="flex flex-col gap-3 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Page{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {page}
        </span>{" "}
        of{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {totalPages}
        </span>
      </p>

      <nav aria-label="Ticket pagination" className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canGoPrevious}
          onClick={() => onPageChange(page - 1)}
          className={buttonClassName}
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Previous
        </button>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
          className={buttonClassName}
        >
          Next
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
}

function TicketsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const teamIdParam = searchParams.get("teamId") ?? "";
  const assigneeIdParam = searchParams.get("assigneeId") ?? "";
  const requesterIdParam = searchParams.get("requesterId") ?? "";

  const unassignedTeamParam = searchParams.get("unassignedTeam");
  const unassignedTeam = unassignedTeamParam === "true";

  const createdFromParam = searchParams.get("createdFrom") ?? "";
  const createdToParam = searchParams.get("createdTo") ?? "";
  const updatedFromParam = searchParams.get("updatedFrom") ?? "";
  const updatedToParam = searchParams.get("updatedTo") ?? "";

  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

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

  useSlaRealtime({
    organizationId,
  });
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
   * /tickets?slaBreached=true
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
  const productIdParam =
    getProductIdFromTicketLibrarySearchParams(searchParams);
  const unassignedParam = searchParams.get("unassigned");
  const slaBreachedParam = searchParams.get("slaBreached");
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

  const productId = productIdParam ?? "";

  const selectedProduct = useMemo(
    () =>
      (productsQuery.data ?? []).find((product) => product.id === productId) ??
      null,
    [productsQuery.data, productId],
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
  const slaBreached = slaBreachedParam === "true";

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

  const handleSlaBreachedChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    updateUrl({
      slaBreached: event.target.checked,
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

    if (productId) {
      filters.push({
        key: "productId",
        label: `Product: ${selectedProduct?.name ?? productId}`,
      });
    }

    if (teamIdParam) {
      filters.push({
        key: "teamId",
        label: `Team ID: ${teamIdParam}`,
      });
    }

    if (assigneeIdParam) {
      filters.push({
        key: "assigneeId",
        label: `Assignee ID: ${assigneeIdParam}`,
      });
    }

    if (requesterIdParam) {
      filters.push({
        key: "requesterId",
        label: `Requester ID: ${requesterIdParam}`,
      });
    }

    if (unassignedTeam) {
      filters.push({
        key: "unassignedTeam",
        label: "No team assigned",
      });
    }

    if (createdFromParam || createdToParam) {
      filters.push({
        key: "createdFrom",
        label: `Created: ${createdFromParam || "any"} – ${createdToParam || "any"}`,
      });
    }

    if (updatedFromParam || updatedToParam) {
      filters.push({
        key: "updatedFrom",
        label: `Updated: ${updatedFromParam || "any"} – ${updatedToParam || "any"}`,
      });
    }

    if (unassigned) {
      filters.push({
        key: "unassigned",
        label: "Unassigned only",
      });
    }

    if (slaBreached) {
      filters.push({
        key: "slaBreached",
        label: "SLA breached only",
      });
    }

    return filters;
  }, [
    searchParam,
    status,
    priority,
    type,
    productId,
    unassigned,
    slaBreached,
    selectedProduct,
    teamIdParam,
    assigneeIdParam,
    requesterIdParam,
    unassignedTeam,
    createdFromParam,
    createdToParam,
    updatedFromParam,
    updatedToParam,
  ]);

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
      productId: productId || undefined,

      teamId: teamIdParam || undefined,
      assigneeId: assigneeIdParam || undefined,
      requesterId: requesterIdParam || undefined,

      createdFrom: createdFromParam || undefined,
      createdTo: createdToParam || undefined,
      updatedFrom: updatedFromParam || undefined,
      updatedTo: updatedToParam || undefined,

      unassigned: unassigned || undefined,
      unassignedTeam: unassignedTeam || undefined,
      slaBreached: slaBreached || undefined,

      sortBy,
      sortOrder,
    }),
    [
      page,
      searchParam,
      status,
      priority,
      type,
      productId,
      teamIdParam,
      assigneeIdParam,
      requesterIdParam,
      createdFromParam,
      createdToParam,
      updatedFromParam,
      updatedToParam,
      unassigned,
      unassignedTeam,
      slaBreached,
      sortBy,
      sortOrder,
    ],
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
          title={productId ? "Product Tickets" : "My Tickets"}
          description={
            productId
              ? `Tickets associated with ${selectedProduct?.name ?? "the selected product"}.`
              : "View and manage tickets in your workspace."
          }
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
        actions={
          <Link
            href="/tickets/create"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <TicketIcon className="size-4" />
            Raise Ticket
          </Link>
        }
      />

      <div className="mt-5 space-y-6">
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

        <Card className="border-border/80 shadow-card">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col gap-4">
              {/* Toolbar heading */}
              <div className="flex items-center gap-2">
                <div className="flex size-9 items-center justify-center rounded-xl border border-border/70 bg-surface-muted">
                  <Filter className="size-4 text-muted-foreground" />
                </div>

                <div>
                  <p className="text-sm font-semibold text-card-foreground">
                    Filter tickets
                  </p>

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
                  className="h-11 w-full rounded-xl border border-input bg-card pl-10 pr-3.5 text-sm text-foreground shadow-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                />
              </div>

              {/* Select filters */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
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
                  label="Product"
                  value={productId}
                  onChange={(value) => {
                    updateUrl({
                      productId: value || null,
                    });
                  }}
                >
                  <option value="">All products</option>

                  {(productsQuery.data ?? []).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                      {!product.isActive ? " (Inactive)" : ""}
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
              <div className="flex flex-col gap-4 border-t border-border/70 pt-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={unassigned}
                      onChange={handleUnassignedChange}
                      className="size-4 rounded border-input"
                    />

                    <span>Unassigned tickets only</span>
                  </label>

                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={slaBreached}
                      onChange={handleSlaBreachedChange}
                      className="size-4 rounded border-input"
                    />

                    <span>SLA breached only</span>
                  </label>
                </div>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <RotateCcw className="size-4" />
                    Clear filters
                  </button>
                )}
              </div>
              {/* Active filters */}
              {hasFilters && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-5">
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
              <div className="inline-flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-surface-muted">
                  <TicketIcon className="size-4" aria-hidden="true" />
                </span>
                <span>
                  <strong className="font-semibold tabular-nums text-foreground">
                    {ticketsQuery.data?.meta.total ?? 0}
                  </strong>{" "}
                  tickets
                </span>
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
