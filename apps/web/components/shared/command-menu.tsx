"use client";

import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BookOpen,
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
import { useQuery } from "@tanstack/react-query";

import { useOrganizations } from "@/hooks/use-organizations";
import { useTickets } from "@/hooks/use-tickets";
import {
  getTicketLibraryEntries,
  ticketLibraryQueryKeys,
} from "@/lib/api/ticket-library";
import {
  buildTicketLibrarySearchHref,
  buildTicketLibrarySearchRequest,
  buildTicketSearchHref,
  buildTicketSearchRequest,
  normalizeTicketSearchQuery,
  resolveTicketSearchViewState,
} from "@/lib/search/ticket-search";
import { useUIStore } from "@/stores/ui-store";
import type { TicketLibraryEntry } from "@/types/ticket-library";
import type { Ticket } from "@/types/tickets";

const SEARCH_DEBOUNCE_MS = 250;

const EMPTY_SEARCH_PARAMS = {};

type GlobalSearchResult =
  | { type: "ticket"; item: Ticket }
  | { type: "article"; item: TicketLibraryEntry };

type WorkspaceViewState =
  | "prompt"
  | "loading"
  | "error"
  | "no-organization"
  | "ready";

function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b[a-z]/g, (character) => character.toUpperCase());
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function GroupState({
  state,
  label,
  error,
  onRetry,
}: {
  state:
    | "prompt"
    | "workspace-loading"
    | "workspace-error"
    | "no-organization"
    | "loading"
    | "error"
    | "results"
    | "empty";
  label: string;
  error: unknown;
  onRetry: () => void;
}) {
  if (state === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"
      >
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Searching {label}...
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="px-3 py-4" role="alert">
        <div className="flex items-start gap-2">
          <AlertCircle
            className="mt-0.5 size-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              Unable to search {label.toLowerCase()}
            </p>
            <p className="mt-1 break-words text-xs text-muted-foreground">
              {errorMessage(error, `The ${label.toLowerCase()} search failed.`)}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-2 rounded-md text-xs font-medium text-primary underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === "empty") {
    return (
      <p
        role="status"
        aria-live="polite"
        className="px-3 py-4 text-sm text-muted-foreground"
      >
        No {label.toLowerCase()} matched this search.
      </p>
    );
  }

  return null;
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

  // Restore focus when closing and focus the search input when opening.
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

  // Ctrl+K / Cmd+K opens or refocuses global search.
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

  // Debounce the normalized query. Blank input is cleared in onChange.
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

  const ticketRequest = useMemo(
    () => buildTicketSearchRequest(organizationId, debouncedQuery),
    [organizationId, debouncedQuery],
  );

  const articleRequest = useMemo(
    () => buildTicketLibrarySearchRequest(organizationId, debouncedQuery),
    [organizationId, debouncedQuery],
  );

  const searchEnabled =
    isOpen && Boolean(ticketRequest && articleRequest) && !isDebouncing;

  // Existing ticket API contract and ticket-detail navigation are unchanged.
  const ticketsQuery = useTickets(
    ticketRequest?.organizationId,
    ticketRequest?.params ?? EMPTY_SEARCH_PARAMS,
    {
      enabled: searchEnabled,
    },
  );

  // Existing organization-scoped Ticket Library API; no new endpoint.
  const articlesQuery = useQuery({
    queryKey:
      organizationId && articleRequest
        ? ticketLibraryQueryKeys.list(organizationId, articleRequest.params)
        : [
            "ticket-library",
            "global-search-disabled",
            organizationId ?? "none",
          ],

    queryFn: () => {
      if (!articleRequest) {
        throw new Error("Organization context is required for article search.");
      }

      return getTicketLibraryEntries(
        articleRequest.organizationId,
        articleRequest.params,
      );
    },

    enabled: searchEnabled,
  });

  const tickets = ticketsQuery.data?.data ?? [];
  const articles = articlesQuery.data?.data ?? [];

  const workspaceState: WorkspaceViewState = !normalizedQuery
    ? "prompt"
    : organizationsQuery.isLoading
      ? "loading"
      : organizationsQuery.isError
        ? "error"
        : !organizationId
          ? "no-organization"
          : "ready";

  const ticketState = resolveTicketSearchViewState({
    query: normalizedQuery,
    organizationLoading: organizationsQuery.isLoading,
    organizationError: organizationsQuery.isError,
    organizationId,
    debouncing: isDebouncing,
    searchLoading: ticketsQuery.isLoading,
    searchError: ticketsQuery.isError,
    resultCount: tickets.length,
  });

  const articleState = resolveTicketSearchViewState({
    query: normalizedQuery,
    organizationLoading: organizationsQuery.isLoading,
    organizationError: organizationsQuery.isError,
    organizationId,
    debouncing: isDebouncing,
    searchLoading: articlesQuery.isLoading,
    searchError: articlesQuery.isError,
    resultCount: articles.length,
  });

  const activeResults: GlobalSearchResult[] = [
    ...(ticketState === "results"
      ? tickets.map((item): GlobalSearchResult => ({ type: "ticket", item }))
      : []),
    ...(articleState === "results"
      ? articles.map((item): GlobalSearchResult => ({ type: "article", item }))
      : []),
  ];

  const activeResultIndex =
    activeResults.length === 0
      ? -1
      : Math.min(activeIndex, activeResults.length - 1);

  const closeMenu = useCallback(() => {
    closeCommandMenu();
    setQuery("");
    setDebouncedQuery("");
    setActiveIndex(0);
  }, [closeCommandMenu]);

  const openResult = useCallback(
    (result: GlobalSearchResult) => {
      const href =
        result.type === "ticket"
          ? `/tickets/${encodeURIComponent(result.item.id)}`
          : buildTicketLibrarySearchHref(
              debouncedQuery,
              result.item.id,
              result.item.productId,
            );

      closeMenu();
      router.push(href);
    },
    [closeMenu, debouncedQuery, router],
  );

  function handleInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" && activeResults.length > 0) {
      event.preventDefault();
      setActiveIndex((current) => (current + 1) % activeResults.length);
      return;
    }

    if (event.key === "ArrowUp" && activeResults.length > 0) {
      event.preventDefault();
      setActiveIndex(
        (current) =>
          (current - 1 + activeResults.length) % activeResults.length,
      );
      return;
    }

    if (event.key === "Enter") {
      const selected = activeResults[activeResultIndex];

      if (selected) {
        event.preventDefault();
        openResult(selected);
      }
    }
  }

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

  function openAllTickets() {
    const href = buildTicketSearchHref(debouncedQuery);
    closeMenu();
    router.push(href);
  }

  function openAllArticles() {
    const href = buildTicketLibrarySearchHref(debouncedQuery);
    closeMenu();
    router.push(href);
  }

  function resultIndexForTicket(ticketId: string): number {
    return activeResults.findIndex(
      (result) => result.type === "ticket" && result.item.id === ticketId,
    );
  }

  function resultIndexForArticle(articleId: string): number {
    return activeResults.findIndex(
      (result) => result.type === "article" && result.item.id === articleId,
    );
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-2 pt-3 sm:p-4 sm:pt-[15vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close global search"
        onClick={closeMenu}
      />

      <div
        ref={dialogRef}
        id="global-ticket-search-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
        onKeyDown={handleDialogKeyDown}
        className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border bg-card shadow-2xl sm:max-h-[calc(100dvh-3rem)]"
      >
        <h2 id="global-search-title" className="sr-only">
          Search tickets and knowledge articles
        </h2>

        <div className="flex min-h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
          <Search
            className="size-5 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />

          <input
            ref={inputRef}
            id="global-search-input"
            type="search"
            role="combobox"
            aria-label="Search tickets and knowledge articles"
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-expanded={activeResults.length > 0}
            aria-activedescendant={
              activeResultIndex >= 0
                ? `global-search-option-${activeResultIndex}`
                : undefined
            }
            autoComplete="off"
            spellCheck={false}
            maxLength={200}
            value={query}
            onChange={(event) => {
              const nextQuery = event.target.value;

              setQuery(nextQuery);
              setActiveIndex(0);

              if (!normalizeTicketSearchQuery(nextQuery)) {
                setDebouncedQuery("");
              }
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Search tickets and knowledge articles..."
            className="h-14 min-w-0 flex-1 bg-transparent px-2 text-sm outline-none placeholder:text-muted-foreground"
          />

          <button
            type="button"
            onClick={closeMenu}
            className="flex size-9 shrink-0 items-center justify-center rounded-md hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close global search"
            title="Close search (Esc)"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          {workspaceState === "prompt" && (
            <div
              role="status"
              className="py-8 text-center text-sm text-muted-foreground"
            >
              <Search
                className="mx-auto mb-3 size-6 opacity-60"
                aria-hidden="true"
              />
              <p className="font-medium text-foreground">
                Search tickets and knowledge articles
              </p>
              <p className="mt-1">
                Search by ticket number, title, problem, resolution, or tag.
              </p>
            </div>
          )}

          {workspaceState === "loading" && (
            <div
              role="status"
              aria-live="polite"
              className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground"
            >
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Loading workspace...
            </div>
          )}

          {workspaceState === "error" && (
            <div className="py-8 text-center" role="alert">
              <AlertCircle
                className="mx-auto mb-2 size-5 text-destructive"
                aria-hidden="true"
              />
              <p className="text-sm font-medium">Unable to load workspace</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {errorMessage(
                  organizationsQuery.error,
                  "The organization context could not be loaded.",
                )}
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

          {workspaceState === "no-organization" && (
            <div className="py-8 text-center" role="status">
              <p className="text-sm font-medium">No organization available</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Join an organization before searching.
              </p>
            </div>
          )}

          {workspaceState === "ready" && (
            <>
              <div
                id="global-search-results"
                role="listbox"
                aria-label="Global search results"
                aria-busy={
                  ticketState === "loading" || articleState === "loading"
                }
                className="space-y-4"
              >
                <section
                  role="group"
                  aria-labelledby="global-search-tickets-heading"
                  className="min-w-0"
                >
                  <div
                    id="global-search-tickets-heading"
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tickets
                    </h3>
                    {ticketsQuery.data && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {ticketsQuery.data.meta.total} found
                      </span>
                    )}
                  </div>

                  <GroupState
                    state={ticketState}
                    label="tickets"
                    error={ticketsQuery.error}
                    onRetry={() => void ticketsQuery.refetch()}
                  />

                  {ticketState === "results" &&
                    tickets.map((ticket) => {
                      const index = resultIndexForTicket(ticket.id);

                      return (
                        <button
                          key={ticket.id}
                          id={`global-search-option-${index}`}
                          type="button"
                          role="option"
                          aria-selected={activeResultIndex === index}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() =>
                            openResult({ type: "ticket", item: ticket })
                          }
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
                      );
                    })}
                </section>

                <section
                  role="group"
                  aria-labelledby="global-search-articles-heading"
                  className="min-w-0 border-t pt-3"
                >
                  <div
                    id="global-search-articles-heading"
                    className="flex items-center justify-between border-b pb-2"
                  >
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Ticket Library
                    </h3>
                    {articlesQuery.data && (
                      <span className="text-xs tabular-nums text-muted-foreground">
                        {articlesQuery.data.meta.total} found
                      </span>
                    )}
                  </div>

                  <GroupState
                    state={articleState}
                    label="Ticket Library articles"
                    error={articlesQuery.error}
                    onRetry={() => void articlesQuery.refetch()}
                  />

                  {articleState === "results" &&
                    articles.map((article) => {
                      const index = resultIndexForArticle(article.id);

                      return (
                        <button
                          key={article.id}
                          id={`global-search-option-${index}`}
                          type="button"
                          role="option"
                          aria-selected={activeResultIndex === index}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={() =>
                            openResult({ type: "article", item: article })
                          }
                          className={[
                            "flex min-h-16 w-full items-start gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            activeResultIndex === index
                              ? "bg-accent"
                              : "hover:bg-accent/60",
                          ].join(" ")}
                        >
                          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                            <BookOpen
                              className="size-4 text-muted-foreground"
                              aria-hidden="true"
                            />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="block text-xs font-semibold text-muted-foreground">
                              Knowledge article
                            </span>
                            <span className="mt-1 block truncate text-sm font-medium text-foreground">
                              {article.title}
                            </span>
                            <span className="mt-1 block line-clamp-2 text-xs leading-5 text-muted-foreground">
                              {article.problem}
                            </span>
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {article.product?.name
                                ? `${article.product.name} · `
                                : ""}
                              {article.tags.slice(0, 3).join(", ")}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                </section>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <p className="text-[11px] text-muted-foreground">
                  <kbd className="rounded border px-1 py-0.5">↑</kbd>{" "}
                  <kbd className="rounded border px-1 py-0.5">↓</kbd> navigate
                  <span className="mx-1.5">·</span>
                  <kbd className="rounded border px-1 py-0.5">Enter</kbd> open
                  <span className="mx-1.5">·</span>
                  <kbd className="rounded border px-1 py-0.5">Esc</kbd> close
                </p>

                <div className="flex flex-wrap gap-2">
                  {(ticketState === "results" || ticketState === "empty") && (
                    <button
                      type="button"
                      onClick={openAllTickets}
                      className="min-h-9 rounded-md px-3 text-xs font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      View all tickets
                      {ticketsQuery.data
                        ? ` (${ticketsQuery.data.meta.total})`
                        : ""}
                    </button>
                  )}

                  {(articleState === "results" || articleState === "empty") && (
                    <button
                      type="button"
                      onClick={openAllArticles}
                      className="min-h-9 rounded-md px-3 text-xs font-medium text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      View all articles
                      {articlesQuery.data
                        ? ` (${articlesQuery.data.meta.total})`
                        : ""}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
