import type { TicketLibraryReportParams } from "@/types/ticket-library-report";

const TICKET_LIBRARY_PATH = "/tickets";

const FILTER_KEYS = [
  "search",
  "status",
  "priority",
  "type",
  "productId",
  "teamId",
  "assigneeId",
  "requesterId",
  "unassigned",
  "unassignedTeam",
  "slaBreached",
  "createdFrom",
  "createdTo",
  "updatedFrom",
  "updatedTo",
  "sortBy",
  "sortOrder",
  "limit",
] as const;

export type TicketLibraryFilterOverrides = Record<
  string,
  string | boolean | null | undefined
>;

export function buildTicketLibraryReportDrilldownUrl(
  current: URLSearchParams,
  overrides: TicketLibraryFilterOverrides = {},
): string {
  const params = new URLSearchParams();

  // Copy all supported Ticket Library filters from the report URL.
  for (const key of FILTER_KEYS) {
    const value = current.get(key);

    if (value !== null && value !== "") {
      params.set(key, value);
    }
  }

  // Override only the selected report dimension.
  for (const [key, value] of Object.entries(overrides)) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false
    ) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  // A specific team and "unassigned team" are mutually exclusive.
  if (overrides.unassignedTeam === true) {
    params.delete("teamId");
  } else if ("teamId" in overrides || params.has("teamId")) {
    params.delete("unassignedTeam");
  }

  // A specific assignee and "unassigned" are mutually exclusive.
  if (overrides.unassigned === true) {
    params.delete("assigneeId");
  } else if ("assigneeId" in overrides || params.has("assigneeId")) {
    params.delete("unassigned");
  }

  // A drill-down always starts from the first page.
  params.delete("page");

  const query = params.toString();

  return query ? `${TICKET_LIBRARY_PATH}?${query}` : TICKET_LIBRARY_PATH;
}

export function ticketLibraryReportParamsFromSearchParams(
  searchParams: URLSearchParams,
): TicketLibraryReportParams {
  const params: Record<string, string | boolean> = {};

  for (const key of FILTER_KEYS) {
    const value = searchParams.get(key);

    if (value === null || value === "") continue;

    if (
      key === "unassigned" ||
      key === "unassignedTeam" ||
      key === "slaBreached"
    ) {
      if (value === "true") {
        params[key] = true;
      }

      continue;
    }

    params[key] = value;
  }

  const dateField = searchParams.get("dateField");

  params.dateField = dateField === "updatedAt" ? "updatedAt" : "createdAt";

  // URL values are validated by the API DTOs.
  return params as TicketLibraryReportParams;
}

export function updateTicketLibraryReportSearchParams(
  current: URLSearchParams,
  updates: TicketLibraryFilterOverrides,
): URLSearchParams {
  const params = new URLSearchParams(current.toString());

  for (const [key, value] of Object.entries(updates)) {
    if (
      value === undefined ||
      value === null ||
      value === "" ||
      value === false
    ) {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  if (params.has("teamId")) {
    params.delete("unassignedTeam");
  }

  if (params.has("assigneeId")) {
    params.delete("unassigned");
  }

  return params;
}
