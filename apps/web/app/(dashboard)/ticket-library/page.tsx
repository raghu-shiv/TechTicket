"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  ExternalLink,
  FilePlus2,
  Pencil,
  Search,
  Trash2,
} from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui";
import { useOrganizations } from "@/hooks/use-organizations";
import { getProducts } from "@/lib/api/products";
import {
  createTicketLibraryEntry,
  deleteTicketLibraryEntry,
  getTicketLibraryEntries,
  ticketLibraryQueryKeys,
  updateTicketLibraryEntry,
} from "@/lib/api/ticket-library";
import { getTickets } from "@/lib/api/tickets";
import type { TicketLibraryEntry } from "@/types/ticket-library";
import type { Ticket } from "@/types/tickets";

const inputClass =
  "mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";
const textAreaClass =
  "mt-1.5 min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";
const PAGE_SIZE = 20;

function uniqueTags(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ).slice(0, 30);
}

export default function TicketLibraryPage() {
  const organizationsQuery = useOrganizations();
  const membership = organizationsQuery.data?.[0];
  const organizationId = membership?.organizationId;
  const canWrite =
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN" ||
    membership?.role === "AGENT";
  const canDelete =
    membership?.role === "OWNER" || membership?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TicketLibraryEntry | null>(
    null,
  );
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [resolution, setResolution] = useState("");
  const [productId, setProductId] = useState("");
  const [sourceTicketId, setSourceTicketId] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const qParams = {
    search: search.trim() || undefined,
    productId: productFilter || undefined,
    page,
    limit: PAGE_SIZE,
  };

  const entriesQuery = useQuery({
    queryKey: organizationId
      ? ticketLibraryQueryKeys.list(organizationId, qParams)
      : ["ticket-library", "disabled"],
    queryFn: () => {
      if (!organizationId) throw new Error("Organization context is required.");
      return getTicketLibraryEntries(organizationId, qParams);
    },
    enabled: Boolean(organizationId),
  });

  const productsQuery = useQuery({
    queryKey: ["products", organizationId],
    queryFn: () => {
      if (!organizationId) throw new Error("Organization context is required.");
      return getProducts(organizationId);
    },
    enabled: Boolean(organizationId),
  });

  const resolvedTicketsQuery = useQuery({
    queryKey: ["ticket-library", "source-tickets", organizationId, "RESOLVED"],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization context is required.");
      const result = await getTickets(organizationId, {
        status: "RESOLVED",
        limit: 100,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });
      return result.data;
    },
    enabled: Boolean(organizationId && canWrite && showForm && !editingEntry),
  });

  const closedTicketsQuery = useQuery({
    queryKey: ["ticket-library", "source-tickets", organizationId, "CLOSED"],
    queryFn: async () => {
      if (!organizationId) throw new Error("Organization context is required.");
      const result = await getTickets(organizationId, {
        status: "CLOSED",
        limit: 100,
        sortBy: "updatedAt",
        sortOrder: "desc",
      });
      return result.data;
    },
    enabled: Boolean(organizationId && canWrite && showForm && !editingEntry),
  });

  const refreshLibrary = () =>
    queryClient.invalidateQueries({ queryKey: ticketLibraryQueryKeys.all });

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!organizationId) throw new Error("Organization context is required.");
      const payload = {
        title: title.trim(),
        problem: problem.trim(),
        resolution: resolution.trim(),
        tags: uniqueTags(tagsText),
        productId,
      };
      if (editingEntry)
        return updateTicketLibraryEntry(
          organizationId,
          editingEntry.id,
          payload,
        );
      return createTicketLibraryEntry(organizationId, {
        ...payload,
        ...(sourceTicketId ? { sourceTicketId } : {}),
      });
    },
    onSuccess: async () => {
      resetForm();
      setPage(1);
      await refreshLibrary();
    },
    onError: (error) =>
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save the knowledge article.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (entryId: string) => {
      if (!organizationId) throw new Error("Organization context is required.");
      return deleteTicketLibraryEntry(organizationId, entryId);
    },
    onSuccess: refreshLibrary,
    onError: (error) =>
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to delete the knowledge article.",
      ),
  });

  function resetForm() {
    setShowForm(false);
    setEditingEntry(null);
    setTitle("");
    setProblem("");
    setResolution("");
    setProductId("");
    setSourceTicketId("");
    setTagsText("");
    setFormError(null);
  }

  function beginCreate() {
    resetForm();
    setShowForm(true);
  }

  function beginEdit(entry: TicketLibraryEntry) {
    setEditingEntry(entry);
    setShowForm(true);
    setTitle(entry.title);
    setProblem(entry.problem);
    setResolution(entry.resolution);
    setProductId(entry.productId ?? "");
    setSourceTicketId("");
    setTagsText(entry.tags.join(", "));
    setFormError(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!title.trim() || !problem.trim() || !resolution.trim()) {
      setFormError("Title, problem, and resolution are required.");
      return;
    }
    if (title.trim().length > 200) {
      setFormError("Title must be 200 characters or fewer.");
      return;
    }
    if (uniqueTags(tagsText).length > 30) {
      setFormError("Use no more than 30 tags.");
      return;
    }
    saveMutation.mutate();
  }

  function selectSourceTicket(value: string, tickets: Ticket[]) {
    setSourceTicketId(value);
    if (!value) return;
    const ticket = tickets.find((item) => item.id === value);
    if (!ticket) return;
    setTitle((current) => (current.trim() ? current : ticket.title));
    setProblem((current) => (current.trim() ? current : ticket.description));
    setProductId((current) => current || ticket.productId || "");
  }

  if (organizationsQuery.isLoading)
    return <LoadingState label="Loading workspace..." />;
  if (organizationsQuery.isError)
    return (
      <ErrorState
        title="Unable to load workspace"
        description={organizationsQuery.error.message}
        onRetry={() => void organizationsQuery.refetch()}
      />
    );
  if (!organizationId || !membership)
    return (
      <EmptyState
        icon={BookOpen}
        title="No organization available"
        description="Join an organization to access the Ticket Library."
      />
    );

  const articles = entriesQuery.data?.data ?? [];
  const sourceTickets = [
    ...(resolvedTicketsQuery.data ?? []),
    ...(closedTicketsQuery.data ?? []),
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ticket Library"
        description="Search reusable knowledge articles with problem descriptions and resolutions. This knowledge base is separate from ticket operations and Ticket Library Reports."
        actions={
          canWrite ? (
            <button
              type="button"
              onClick={beginCreate}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <FilePlus2 className="size-4" /> New article
            </button>
          ) : undefined
        }
      />

      {showForm && canWrite && (
        <Card>
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div>
              <h2 className="text-base font-semibold">
                {editingEntry
                  ? "Edit knowledge article"
                  : "Create knowledge article"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Capture a reusable problem and resolution. Linking a
                resolved/closed ticket is optional.
              </p>
            </div>
            <form onSubmit={submit} className="space-y-4">
              {!editingEntry && (
                <div>
                  <label
                    htmlFor="library-source-ticket"
                    className="text-sm font-medium"
                  >
                    Source ticket{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <select
                    id="library-source-ticket"
                    value={sourceTicketId}
                    onChange={(event) =>
                      selectSourceTicket(event.target.value, sourceTickets)
                    }
                    disabled={
                      saveMutation.isPending ||
                      (resolvedTicketsQuery.isLoading &&
                        closedTicketsQuery.isLoading)
                    }
                    className={inputClass}
                  >
                    <option value="">Write an independent article</option>
                    {sourceTickets.map((ticket) => (
                      <option key={ticket.id} value={ticket.id}>
                        {ticket.ticketNumber} — {ticket.title} ({ticket.status})
                      </option>
                    ))}
                  </select>
                  {(resolvedTicketsQuery.isError ||
                    closedTicketsQuery.isError) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Some source tickets could not be loaded. You can still
                      create an independent article.
                    </p>
                  )}
                </div>
              )}
              <div>
                <label htmlFor="library-title" className="text-sm font-medium">
                  Article title *
                </label>
                <input
                  id="library-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={200}
                  required
                  disabled={saveMutation.isPending}
                  className={inputClass}
                  placeholder="Short, searchable title"
                />
              </div>
              <div>
                <label
                  htmlFor="library-problem"
                  className="text-sm font-medium"
                >
                  Problem *
                </label>
                <textarea
                  id="library-problem"
                  value={problem}
                  onChange={(event) => setProblem(event.target.value)}
                  required
                  disabled={saveMutation.isPending}
                  className={textAreaClass}
                  placeholder="Symptoms, context, and conditions where this occurs"
                />
              </div>
              <div>
                <label
                  htmlFor="library-resolution"
                  className="text-sm font-medium"
                >
                  Resolution *
                </label>
                <textarea
                  id="library-resolution"
                  value={resolution}
                  onChange={(event) => setResolution(event.target.value)}
                  required
                  disabled={saveMutation.isPending}
                  className={textAreaClass}
                  placeholder="Steps to resolve or work around the problem"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="library-product"
                    className="text-sm font-medium"
                  >
                    Product{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <select
                    id="library-product"
                    value={productId}
                    onChange={(event) => setProductId(event.target.value)}
                    disabled={saveMutation.isPending}
                    className={inputClass}
                  >
                    <option value="">No product</option>
                    {(productsQuery.data ?? []).map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name}
                        {product.isActive ? "" : " (Inactive)"}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="library-tags" className="text-sm font-medium">
                    Tags{" "}
                    <span className="font-normal text-muted-foreground">
                      (comma-separated)
                    </span>
                  </label>
                  <input
                    id="library-tags"
                    value={tagsText}
                    onChange={(event) => setTagsText(event.target.value)}
                    disabled={saveMutation.isPending}
                    className={inputClass}
                    placeholder="email, authentication, network"
                  />
                </div>
              </div>
              {formError && (
                <p className="text-sm text-destructive" role="alert">
                  {formError}
                </p>
              )}
              <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saveMutation.isPending}
                  className="h-10 rounded-md border border-input px-4 text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveMutation.isPending
                    ? "Saving..."
                    : editingEntry
                      ? "Save changes"
                      : "Create article"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <label htmlFor="library-search" className="sr-only">
              Search knowledge articles
            </label>
            <input
              id="library-search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search title, problem, resolution, or tags..."
              className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="library-product-filter" className="sr-only">
              Filter by product
            </label>
            <select
              id="library-product-filter"
              value={productFilter}
              onChange={(event) => {
                setProductFilter(event.target.value);
                setPage(1);
              }}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All products</option>
              {(productsQuery.data ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {entriesQuery.isLoading && (
        <LoadingState label="Loading knowledge articles..." />
      )}
      {entriesQuery.isError && (
        <ErrorState
          title="Unable to load Ticket Library"
          description={
            entriesQuery.error instanceof Error
              ? entriesQuery.error.message
              : "Knowledge articles could not be loaded."
          }
          onRetry={() => void entriesQuery.refetch()}
        />
      )}
      {entriesQuery.isSuccess && articles.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title="No knowledge articles found"
          description={
            search || productFilter
              ? "Try a different search or product filter, or create a new article."
              : "Create a reusable knowledge article to help solve recurring support problems."
          }
          action={
            canWrite
              ? { label: "Create article", onClick: beginCreate }
              : undefined
          }
        />
      )}
      {entriesQuery.isSuccess && articles.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            {entriesQuery.data.meta.total === 0
              ? 0
              : (page - 1) * PAGE_SIZE + 1}
            –{(page - 1) * PAGE_SIZE + articles.length} of{" "}
            {entriesQuery.data.meta.total} article
            {entriesQuery.data.meta.total === 1 ? "" : "s"}.
          </p>
          {articles.map((article) => (
            <Card key={article.id}>
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold">{article.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {article.product && (
                        <Badge variant="outline">{article.product.name}</Badge>
                      )}
                      {article.sourceTicket && (
                        <Link
                          href={`/tickets/${encodeURIComponent(article.sourceTicket.id)}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                        >
                          Source: {article.sourceTicket.ticketNumber}
                          <ExternalLink className="size-3" />
                        </Link>
                      )}
                      {article.tags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Created{" "}
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(article.createdAt))}{" "}
                      by {article.createdBy.name}
                    </p>
                  </div>
                  {canWrite && (
                    <div className="flex gap-2 self-start">
                      <button
                        type="button"
                        onClick={() => beginEdit(article)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete knowledge article “${article.title}”?`,
                              )
                            )
                              deleteMutation.mutate(article.id);
                          }}
                          disabled={deleteMutation.isPending}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div className="grid gap-4 border-t pt-4 md:grid-cols-2">
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Problem
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                      {article.problem}
                    </p>
                  </section>
                  <section>
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Resolution
                    </h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6">
                      {article.resolution}
                    </p>
                  </section>
                </div>
              </CardContent>
            </Card>
          ))}
          {entriesQuery.data.meta.totalPages > 1 && (
            <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} of {entriesQuery.data.meta.totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1 || entriesQuery.isFetching}
                  className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) =>
                      Math.min(entriesQuery.data.meta.totalPages, current + 1),
                    )
                  }
                  disabled={
                    page >= entriesQuery.data.meta.totalPages ||
                    entriesQuery.isFetching
                  }
                  className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {deleteMutation.isError && (
        <p className="text-sm text-destructive" role="alert">
          {deleteMutation.error instanceof Error
            ? deleteMutation.error.message
            : "Unable to delete article."}
        </p>
      )}
    </div>
  );
}
