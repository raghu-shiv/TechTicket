import type { TicketListParams } from "@/types/tickets";

export const TICKET_SEARCH_LIMIT = 8;

export function normalizeTicketSearchQuery(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

export interface TicketSearchRequest {
  organizationId: string;
  params: TicketListParams;
}

/**
 * Builds a ticket search request using the existing Tickets API contract.
 *
 * Organization scope is passed separately from query parameters. The API
 * client sends it as x-organization-id, and the server enforces authorization
 * and organization isolation.
 */
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
 * Builds the existing Tickets page URL while preserving the normalized query.
 */
export function buildTicketSearchHref(rawQuery: string): string {
  const search = normalizeTicketSearchQuery(rawQuery);

  if (!search) {
    return "/tickets";
  }

  const params = new URLSearchParams({ search });

  return `/tickets?${params.toString()}`;
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

/**
 * Resolves what the command menu should render.
 *
 * This is deliberately a pure function so loading, error, results, and empty
 * states can be tested without a browser or React component test framework.
 */
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
