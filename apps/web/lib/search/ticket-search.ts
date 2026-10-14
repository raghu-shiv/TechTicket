import type { TicketListParams } from "@/types/tickets";

export const TICKET_SEARCH_LIMIT = 8;
export const TICKET_LIBRARY_SEARCH_LIMIT = 6;
export const MEMBER_SEARCH_LIMIT = 8;
export const MEMBER_SEARCH_MIN_LENGTH = 2;
export const MEMBER_SEARCH_MAX_LENGTH = 100;

export interface MemberSearchRequest {
  organizationId: string;
  params: {
    search: string;
    limit: number;
  };
}

export function normalizeTicketSearchQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

export interface TicketSearchRequest {
  organizationId: string;
  params: TicketListParams;
}

export interface TicketLibrarySearchParams {
  search: string;
  page: number;
  limit: number;
}

export interface TicketLibrarySearchRequest {
  organizationId: string;
  params: TicketLibrarySearchParams;
}

export function buildTicketSearchRequest(
  organizationId: string | undefined,
  rawQuery: string,
): TicketSearchRequest | null {
  const search = normalizeTicketSearchQuery(rawQuery);

  if (!organizationId || !search) {
    return null;
  }

  return {
    organizationId,
    params: {
      page: 1,
      limit: TICKET_SEARCH_LIMIT,
      search,
      sortBy: "updatedAt",
      sortOrder: "desc",
    },
  };
}

/**
 * Uses the existing GET /api/v1/ticket-library contract.
 * Organization context is sent separately through x-organization-id.
 */
export function buildTicketLibrarySearchRequest(
  organizationId: string | undefined,
  rawQuery: string,
): TicketLibrarySearchRequest | null {
  const search = normalizeTicketSearchQuery(rawQuery);

  if (!organizationId || !search) {
    return null;
  }

  return {
    organizationId,
    params: {
      page: 1,
      limit: TICKET_LIBRARY_SEARCH_LIMIT,
      search,
    },
  };
}

/**
 * Opens the existing Ticket Library UI.
 *
 * When an article ID is provided, the page filters to the matching query,
 * resets to page one, and focuses the selected article. No unregistered
 * /ticket-library/:entryId route is assumed.
 */
export function buildTicketLibrarySearchHref(
  rawQuery: string,
  selectedArticleId?: string,
  productId?: string | null,
): string {
  const params = new URLSearchParams();
  const search = normalizeTicketSearchQuery(rawQuery);

  if (search) {
    params.set("search", search);
  }

  if (selectedArticleId) {
    params.set("selectedArticleId", selectedArticleId);
    params.set("page", "1");

    if (productId) {
      params.set("productId", productId);
    }
  }

  const queryString = params.toString();

  return queryString ? `/ticket-library?${queryString}` : "/ticket-library";
}

/**
 * Keeps View all results for tickets compatible with UI-4.
 */
export function buildTicketSearchHref(rawQuery: string): string {
  const search = normalizeTicketSearchQuery(rawQuery);

  if (!search) {
    return "/tickets";
  }

  return `/tickets?${new URLSearchParams({ search }).toString()}`;
}

export type TicketSearchViewState =
  | "prompt"
  | "workspace-loading"
  | "workspace-error"
  | "no-organization"
  | "loading"
  | "error"
  | "results"
  | "empty";

export interface TicketSearchViewStateInput {
  query: string;
  organizationLoading: boolean;
  organizationError: boolean;
  organizationId: string | undefined;
  debouncing: boolean;
  searchLoading: boolean;
  searchError: boolean;
  resultCount: number;
}

export function resolveTicketSearchViewState(
  input: TicketSearchViewStateInput,
): TicketSearchViewState {
  if (!normalizeTicketSearchQuery(input.query)) {
    return "prompt";
  }

  if (input.organizationLoading) {
    return "workspace-loading";
  }

  if (input.organizationError) {
    return "workspace-error";
  }

  if (!input.organizationId) {
    return "no-organization";
  }

  if (input.debouncing) {
    return "loading";
  }

  if (input.searchError) {
    return "error";
  }

  if (input.searchLoading) {
    return "loading";
  }

  return input.resultCount > 0 ? "results" : "empty";
}

/**
 * Build a server-side member-search request only for valid queries.
 * Role authorization is enforced separately in both the UI and API.
 */
export function buildMemberSearchRequest(
  organizationId: string | undefined,
  rawQuery: string,
): MemberSearchRequest | null {
  const search = normalizeTicketSearchQuery(rawQuery);

  if (
    !organizationId ||
    search.length < MEMBER_SEARCH_MIN_LENGTH ||
    search.length > MEMBER_SEARCH_MAX_LENGTH
  ) {
    return null;
  }

  return {
    organizationId,
    params: {
      search,
      limit: MEMBER_SEARCH_LIMIT,
    },
  };
}

/**
 * Navigate to the existing Users page. The selected user is highlighted
 * and focused there; no new user-detail route is assumed.
 */
export function buildMemberSearchHref(
  rawQuery: string,
  selectedUserId?: string,
): string {
  const params = new URLSearchParams();
  const search = normalizeTicketSearchQuery(rawQuery);

  if (search) {
    params.set("search", search);
  }

  if (selectedUserId) {
    params.set("selectedUserId", selectedUserId);
  }

  const queryString = params.toString();

  return queryString ? `/users?${queryString}` : "/users";
}
