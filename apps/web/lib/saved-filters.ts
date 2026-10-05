import type {
  SavedFilterDefinition,
  SavedFilterQuery,
} from "@/types/saved-filters";
import type {
  TicketListParams,
  TicketPriority,
  TicketSortField,
  TicketSortOrder,
  TicketStatus,
  TicketType,
} from "@/types/tickets";

const DEFAULT_SORT_BY: TicketSortField = "updatedAt";
const DEFAULT_SORT_ORDER: TicketSortOrder = "desc";
const DEFAULT_LIMIT = 20;

const STATUS_VALUES: readonly TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "PENDING",
  "RESOLVED",
  "CLOSED",
];

const PRIORITY_VALUES: readonly TicketPriority[] = [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
];

const TYPE_VALUES: readonly TicketType[] = [
  "INCIDENT",
  "SERVICE_REQUEST",
  "QUESTION",
  "PROBLEM",
];

const SORT_FIELD_VALUES: readonly TicketSortField[] = [
  "createdAt",
  "updatedAt",
  "priority",
  "status",
  "title",
];

const SORT_ORDER_VALUES: readonly TicketSortOrder[] = ["asc", "desc"];

function isEnumValue<T extends string>(
  value: string | null,
  values: readonly T[],
): value is T {
  return value !== null && values.includes(value as T);
}

function parsePositiveInteger(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return undefined;
  }

  return parsed;
}

/**
 * Convert the current ticket-library URL query into a reusable
 * saved-filter definition.
 *
 * `page` is intentionally ignored.
 */
export function searchParamsToSavedFilter(
  searchParams: URLSearchParams,
): SavedFilterDefinition {
  const definition: SavedFilterDefinition = {};

  const search = searchParams.get("search")?.trim();

  if (search) {
    definition.search = search;
  }

  const status = searchParams.get("status");

  if (isEnumValue(status, STATUS_VALUES)) {
    definition.status = status;
  }

  const priority = searchParams.get("priority");

  if (isEnumValue(priority, PRIORITY_VALUES)) {
    definition.priority = priority;
  }

  const type = searchParams.get("type");

  if (isEnumValue(type, TYPE_VALUES)) {
    definition.type = type;
  }

  const assigneeId = searchParams.get("assigneeId")?.trim();

  if (assigneeId) {
    definition.assigneeId = assigneeId;
  }

  const teamId = searchParams.get("teamId")?.trim();

  if (teamId) {
    definition.teamId = teamId;
  }

  const requesterId = searchParams.get("requesterId")?.trim();

  if (requesterId) {
    definition.requesterId = requesterId;
  }

  const unassigned = searchParams.get("unassigned");

  if (unassigned === "true") {
    definition.unassigned = true;
  }

  const unassignedTeam = searchParams.get("unassignedTeam");

  if (unassignedTeam === "true") {
    definition.unassignedTeam = true;
  }

  const slaBreached = searchParams.get("slaBreached");

  if (slaBreached === "true") {
    definition.slaBreached = true;
  }

  const createdFrom = searchParams.get("createdFrom")?.trim();

  if (createdFrom) {
    definition.createdFrom = createdFrom;
  }

  const createdTo = searchParams.get("createdTo")?.trim();

  if (createdTo) {
    definition.createdTo = createdTo;
  }

  const updatedFrom = searchParams.get("updatedFrom")?.trim();

  if (updatedFrom) {
    definition.updatedFrom = updatedFrom;
  }

  const updatedTo = searchParams.get("updatedTo")?.trim();

  if (updatedTo) {
    definition.updatedTo = updatedTo;
  }

  const sortBy = searchParams.get("sortBy");

  definition.sortBy = isEnumValue(sortBy, SORT_FIELD_VALUES)
    ? sortBy
    : DEFAULT_SORT_BY;

  const sortOrder = searchParams.get("sortOrder");

  definition.sortOrder = isEnumValue(sortOrder, SORT_ORDER_VALUES)
    ? sortOrder
    : DEFAULT_SORT_ORDER;

  const limit = parsePositiveInteger(searchParams.get("limit"));

  definition.limit = limit ?? DEFAULT_LIMIT;

  return definition;
}

/**
 * Convert a saved-filter definition into the ticket-library query.
 *
 * This intentionally does not return `page`.
 * Applying a saved filter always starts the ticket library at page 1.
 */
export function savedFilterToTicketParams(
  filters: SavedFilterDefinition,
): SavedFilterQuery {
  return {
    search: filters.search,

    status: filters.status,
    priority: filters.priority,
    type: filters.type,

    assigneeId: filters.assigneeId,
    teamId: filters.teamId,
    requesterId: filters.requesterId,

    unassigned: filters.unassigned,
    unassignedTeam: filters.unassignedTeam,
    slaBreached: filters.slaBreached,

    createdFrom: filters.createdFrom,
    createdTo: filters.createdTo,

    updatedFrom: filters.updatedFrom,
    updatedTo: filters.updatedTo,

    sortBy: filters.sortBy ?? DEFAULT_SORT_BY,
    sortOrder: filters.sortOrder ?? DEFAULT_SORT_ORDER,

    limit: filters.limit ?? DEFAULT_LIMIT,
  };
}

/**
 * Convert a saved filter into URL query parameters suitable for
 * the `/tickets` page.
 *
 * Existing URL query state is not reused here. The saved filter
 * becomes the complete current query.
 */
export function savedFilterToSearchParams(
  filters: SavedFilterDefinition,
): URLSearchParams {
  const params = new URLSearchParams();

  const ticketParams = savedFilterToTicketParams(filters);

  Object.entries(ticketParams).forEach(([key, value]) => {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false
    ) {
      return;
    }

    params.set(key, String(value));
  });

  return params;
}

/**
 * Determines whether a saved filter represents a meaningful
 * user-defined query beyond the normal library defaults.
 */
export function hasSavedFilterCriteria(
  filters: SavedFilterDefinition,
): boolean {
  return Boolean(
    filters.search ||
    filters.status ||
    filters.priority ||
    filters.type ||
    filters.assigneeId ||
    filters.teamId ||
    filters.requesterId ||
    filters.unassigned ||
    filters.unassignedTeam ||
    filters.slaBreached ||
    filters.createdFrom ||
    filters.createdTo ||
    filters.updatedFrom ||
    filters.updatedTo,
  );
}

/**
 * Remove the transient pagination field from a ticket query before
 * persisting it as a saved filter.
 */
export function ticketParamsToSavedFilter(
  params: TicketListParams,
): SavedFilterDefinition {
  const filters = { ...params };
  delete filters.page;

  return filters;
}
