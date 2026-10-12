"use client";

import { useRouter } from "next/navigation";
import {
  AlertCircle,
  LoaderCircle,
  Search,
  Ticket as TicketIcon,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { useOrganizations } from "@/hooks/use-organizations";
import { useTickets } from "@/hooks/use-tickets";
import {
  buildTicketSearchHref,
  buildTicketSearchRequest,
  normalizeTicketSearchQuery,
  resolveTicketSearchViewState,
} from "@/lib/search/ticket-search";
import { useUIStore } from "@/stores/ui-store";
import type { Ticket } from "@/types/tickets";

const SEARCH_DEBOUNCE_MS = 250;
const EMPTY_SEARCH_PARAMS = {};

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

export function CommandMenu() {
  const router = useRouter();

  const isOpen = useUIStore((state) => state.isCommandMenuOpen);
  const openCommandMenu = useUIStore((state) => state.openCommandMenu);
  const closeCommandMenu = useUIStore((state) => state.closeCommandMenu);

  const organizationsQuery = useOrganizations();
  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const normalizedQuery = normalizeTicketSearchQuery(query);
  const isDebouncing = normalizedQuery !== debouncedQuery;

  /*
   * Focus the input when the dialog opens, then restore focus to the element
   * that opened it when the dialog closes.
   */
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const activeElement = document.activeElement;

    previousFocusRef.current =
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null;

    inputRef.current?.focus();

    return () => {
      const previousElement = previousFocusRef.current;
      previousFocusRef.current = null;

      if (previousElement?.isConnected) {
        previousElement.focus();
      }
    };
  }, [isOpen]);

  /*
   * Support Ctrl+K and Cmd+K even when focus is outside the top-bar button.
   */
  useEffect(() => {
    function handleGlobalKeyDown(event: globalThis.KeyboardEvent) {
      const isSearchShortcut =
        (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k";

      if (!isSearchShortcut) {
        return;
      }

      event.preventDefault();

      if (isOpen) {
        inputRef.current?.focus();
      } else {
        openCommandMenu();
      }
    }

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      window.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen, openCommandMenu]);

  /*
   * Debounce typing to avoid issuing a request for every keystroke.
   * A blank query never triggers a ticket request.
   */
  useEffect(() => {
    if (!isOpen || !normalizedQuery) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedQuery(normalizedQuery);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOpen, normalizedQuery]);

  const searchRequest = useMemo(
    () => buildTicketSearchRequest(organizationId, debouncedQuery),
    [organizationId, debouncedQuery],
  );

  const searchEnabled = isOpen && Boolean(searchRequest) && !isDebouncing;

  const ticketsQuery = useTickets(
    searchRequest?.organizationId,
    searchRequest?.params ?? EMPTY_SEARCH_PARAMS,
    {
      enabled: searchEnabled,
    },
  );

  const tickets = ticketsQuery.data?.data ?? [];
  const totalResults = ticketsQuery.data?.meta.total ?? tickets.length;

  const viewState = resolveTicketSearchViewState({
    query: normalizedQuery,
    organizationLoading: organizationsQuery.isLoading,
    organizationError: organizationsQuery.isError,
    organizationId,
    debouncing: isDebouncing,
    searchLoading: ticketsQuery.isLoading,
    searchError: ticketsQuery.isError,
    resultCount: tickets.length,
  });

  const activeResultIndex =
    tickets.length === 0 ? -1 : Math.min(activeIndex, tickets.length - 1);

  const closeMenu = useCallback(() => {
    closeCommandMenu();
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(0);
  }, [closeCommandMenu]);

  const openTicket = useCallback(
    (ticket: Ticket) => {
      const href = `/tickets/${encodeURIComponent(ticket.id)}`;

      closeMenu();
      router.push(href);
    },
    [closeMenu, router],
  );

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      if (viewState !== "results" || tickets.length === 0) {
        return;
      }

      event.preventDefault();

      setActiveIndex((current) => {
        if (current < 0) {
          return 0;
        }

        return (current + 1) % tickets.length;
      });

      return;
    }

    if (event.key === "ArrowUp") {
      if (viewState !== "results" || tickets.length === 0) {
        return;
      }

      event.preventDefault();

      setActiveIndex((current) => {
        if (current < 0) {
          return tickets.length - 1;
        }

        return (current - 1 + tickets.length) % tickets.length;
      });

      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (
        viewState === "results" &&
        activeResultIndex >= 0 &&
        tickets[activeResultIndex]
      ) {
        openTicket(tickets[activeResultIndex]);
      }
    }
  }

  /*
   * Keep keyboard focus within the open dialog. Escape closes it from the
   * input, close button, result actions, or other dialog controls.
   */
  function handleDialogKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      "input:not([disabled]), button:not([disabled]), a[href]",
    );

    if (!focusable || focusable.length === 0) {
      return;
    }

    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function openAllResults() {
    const href = buildTicketSearchHref(debouncedQuery);

    closeMenu();
    router.push(href);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-2 pt-3 sm:p-4 sm:pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close ticket search"
        onClick={closeMenu}
      />

      <div
        ref={dialogRef}
        id="global-ticket-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-ticket-search-title"
        onKeyDown={handleDialogKeyDown}
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <h2 id="global-ticket-search-title" className="sr-only">
          Search tickets
        </h2>

        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Search
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <input
            ref={inputRef}
            id="global-ticket-search-input"
            type="search"
            role="combobox"
            aria-label="Search tickets"
            aria-autocomplete="list"
            aria-controls="global-ticket-search-results"
            aria-expanded={viewState === "results"}
            aria-activedescendant={
              viewState === "results" && activeResultIndex >= 0
                ? `global-ticket-search-option-${activeResultIndex}`
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
            maxLength={200}
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;

              setQuery(nextQuery);

              if (!normalizeTicketSearchQuery(nextQuery)) {
                setDebouncedQuery("");
              }

              setActiveIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search tickets by number, title, or description..."
            className="h-14 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />

          <button
            type="button"
            onClick={closeMenu}
            className="flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close ticket search"
            title="Close search (Esc)"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {viewState === "prompt" && (
            <div
              className="py-8 text-center text-sm text-muted-foreground"
              role="status"
            >
              <TicketIcon
                className="mx-auto mb-3 size-6 opacity-60"
                aria-hidden="true"
              />
              <p className="font-medium text-foreground">Search tickets</p>
              <p className="mt-1">
                Enter a ticket number, title, or words from its description.
              </p>
            </div>
          )}

          {viewState === "workspace-loading" && (
            <div
              className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading workspace...
            </div>
          )}

          {viewState === "workspace-error" && (
            <div className="py-8 text-center" role="alert">
              <AlertCircle
                className="mx-auto mb-2 size-5 text-destructive"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">Unable to load workspace</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {organizationsQuery.error instanceof Error
                  ? organizationsQuery.error.message
                  : "The organization context could not be loaded."}
              </p>
              <button
                type="button"
                onClick={() => void organizationsQuery.refetch()}
                className="mt-3 rounded-md px-3 py-2 text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Retry
              </button>
            </div>
          )}

          {viewState === "no-organization" && (
            <div className="py-8 text-center" role="status">
              <p className="text-sm font-medium">No organization available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Join an organization before searching tickets.
              </p>
            </div>
          )}

          {viewState === "loading" && (
            <div
              className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Searching tickets...
            </div>
          )}

          {viewState === "error" && (
            <div className="py-8 text-center" role="alert">
              <AlertCircle
                className="mx-auto mb-2 size-5 text-destructive"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">Ticket search failed</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {ticketsQuery.error instanceof Error
                  ? ticketsQuery.error.message
                  : "The ticket search request could not be completed."}
              </p>
              <button
                type="button"
                onClick={() => void ticketsQuery.refetch()}
                className="mt-3 rounded-md px-3 py-2 text-sm font-medium underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Retry
              </button>
            </div>
          )}

          {viewState === "empty" && (
            <div className="py-8 text-center" role="status" aria-live="polite">
              <Search
                className="mx-auto mb-3 size-6 text-muted-foreground"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">No tickets found</p>
              <p className="mt-1 break-words text-sm text-muted-foreground">
                No tickets matched “{debouncedQuery}”.
              </p>
            </div>
          )}

          <div
            id="global-ticket-search-results"
            role="listbox"
            aria-label="Ticket search results"
            aria-busy={viewState === "loading"}
            className={
              viewState === "results"
                ? "max-h-[55dvh] overflow-y-auto sm:max-h-96"
                : "hidden"
            }
          >
            {viewState === "results" &&
              tickets.map((ticket, index) => (
                <button
                  key={ticket.id}
                  id={`global-ticket-search-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={activeResultIndex === index}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openTicket(ticket)}
                  className={[
                    "flex min-h-16 w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    activeResultIndex === index
                      ? "bg-accent"
                      : "hover:bg-accent/60",
                  ].join(" ")}
                >
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                    <TicketIcon
                      className="size-4 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-xs font-semibold text-muted-foreground">
                        {ticket.ticketNumber}
                      </span>
                      <span className="rounded-md border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {formatEnumLabel(ticket.status)}
                      </span>
                    </span>

                    <span className="mt-1 block truncate text-sm font-medium text-foreground">
                      {ticket.title}
                    </span>

                    <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                      {ticket.description}
                    </span>

                    <span className="mt-1 block text-xs text-muted-foreground">
                      {formatEnumLabel(ticket.priority)}
                      {ticket.requester?.name
                        ? ` · Requested by ${ticket.requester.name}`
                        : ""}
                    </span>
                  </span>
                </button>
              ))}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t px-3 py-2 sm:px-4">
          <p className="text-[11px] text-muted-foreground">
            <kbd className="rounded border px-1 py-0.5">↑</kbd>{" "}
            <kbd className="rounded border px-1 py-0.5">↓</kbd> navigate
            <span className="mx-1.5">·</span>
            <kbd className="rounded border px-1 py-0.5">Enter</kbd> open
            <span className="mx-1.5">·</span>
            <kbd className="rounded border px-1 py-0.5">Esc</kbd> close
          </p>

          {(viewState === "results" || viewState === "empty") && (
            <button
              type="button"
              onClick={openAllResults}
              className="min-h-9 rounded-md px-3 text-xs font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View all results
              {totalResults > 0 ? ` (${totalResults})` : ""}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
