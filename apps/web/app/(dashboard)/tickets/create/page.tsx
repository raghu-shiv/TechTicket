"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Inbox,
  Paperclip,
  Ticket as TicketIcon,
} from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared";
import { Card, CardContent } from "@/components/ui";
import { useOrganizations } from "@/hooks/use-organizations";
import { analyticsDashboardQueryKeys } from "@/hooks/use-analytics-dashboard";
import { ticketsQueryKeys } from "@/hooks/use-tickets";
import { getProducts } from "@/lib/api/products";
import { createTicket, uploadTicketAttachment } from "@/lib/api/tickets";
import {
  validateTicketDraft,
  type TicketDraftErrors,
} from "@/lib/ticket-creation";
import type { TicketPriority, TicketType } from "@/types/tickets";

const TICKET_TYPES: Array<{ value: TicketType; label: string }> = [
  { value: "INCIDENT", label: "Incident" },
  { value: "SERVICE_REQUEST", label: "Service Request" },
  { value: "QUESTION", label: "Question" },
  { value: "PROBLEM", label: "Problem" },
];

const TICKET_PRIORITIES: Array<{
  value: TicketPriority;
  label: string;
}> = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

const inputClassName =
  "mt-2 h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-sm text-foreground shadow-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70";

const textAreaClassName =
  "mt-2 min-h-36 w-full resize-y rounded-xl border border-input bg-card px-3.5 py-3 text-sm leading-6 text-foreground shadow-sm outline-none transition-[border-color,background-color,box-shadow] duration-150 placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-destructive/15 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:opacity-70";

const secondaryLinkClassName =
  "inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const primaryButtonClassName =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition-[background-color,box-shadow,transform] duration-150 hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export default function CreateTicketPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const organizationsQuery = useOrganizations();
  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const productsQuery = useQuery({
    queryKey: ["products", organizationId],
    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required.");
      }

      return getProducts(organizationId);
    },
    enabled: Boolean(organizationId),
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>("INCIDENT");
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [productId, setProductId] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  const [fieldErrors, setFieldErrors] = useState<TicketDraftErrors>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function clearFieldError(field: keyof TicketDraftErrors) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setApiError(null);

    if (!organizationId) {
      setApiError(
        "Your organization context is unavailable. Refresh the page and try again.",
      );
      return;
    }

    const errors = validateTicketDraft({
      title,
      description,
      files,
    });

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    // Do not submit a product ID that is not in the current organization's
    // active product list. The API independently validates organization scope.
    if (productId) {
      const selectedProduct = productsQuery.data?.find(
        (product) => product.id === productId && product.isActive,
      );

      if (!selectedProduct) {
        setApiError(
          "The selected product is unavailable. Select an active product or choose No product.",
        );
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const created = await createTicket(organizationId, {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        ...(productId ? { productId } : {}),
      });

      // The creation endpoint does not accept files. Upload each file through
      // the existing ticket attachment endpoint after a ticket has been made.
      // Continue attempting later files if an individual upload fails.
      let attachmentUploadFailed = false;

      for (const file of files) {
        try {
          await uploadTicketAttachment(organizationId, created.id, file);
        } catch {
          attachmentUploadFailed = true;
        }
      }

      // Refresh both operational ticket queries and the report/dashboard
      // query caches after creating a ticket.
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ticketsQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: analyticsDashboardQueryKeys.all,
        }),
        queryClient.invalidateQueries({
          queryKey: ["product-analytics"],
        }),
      ]);

      const attachmentWarning = attachmentUploadFailed
        ? "&attachmentUpload=failed"
        : "";

      // Replace history so Back will not invite the user to submit again.
      router.replace(
        `/tickets/${encodeURIComponent(created.id)}?created=1${attachmentWarning}`,
      );
      router.refresh();
    } catch (error) {
      setApiError(
        error instanceof Error
          ? error.message
          : "Unable to create the ticket. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

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
          title="Raise Ticket"
          description="Submit an issue or request to your support team."
        />
        <EmptyState
          icon={Inbox}
          title="No organization available"
          description="You must belong to an organization before you can create a ticket."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Raise Ticket"
        description="Describe the issue or request. Your support team will use these details to triage it."
        actions={
          <Link href="/tickets" className={secondaryLinkClassName}>
            <ArrowLeft className="size-4" />
            Back to tickets
          </Link>
        }
      />

      <Card className="mx-auto max-w-4xl overflow-hidden border-border/80 shadow-card">
        <CardContent className="p-5 sm:p-8">
          <form onSubmit={handleSubmit} noValidate className="space-y-8">
            {apiError && (
              <div
                className="rounded-xl border border-danger-border bg-danger-bg/70 px-4 py-3 text-sm text-danger"
                role="alert"
              >
                <p className="font-medium">Ticket could not be submitted</p>
                <p className="mt-1">{apiError}</p>
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="ticket-title"
                className="block text-sm font-semibold leading-5 text-foreground"
              >
                Title <span aria-hidden="true">*</span>
              </label>
              <input
                id="ticket-title"
                name="title"
                type="text"
                required
                maxLength={200}
                autoComplete="off"
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearFieldError("title");
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.title)}
                aria-describedby={
                  fieldErrors.title ? "ticket-title-error" : undefined
                }
                placeholder="A short summary of the issue"
                className={inputClassName}
              />
              {fieldErrors.title && (
                <p
                  id="ticket-title-error"
                  className="mt-1.5 text-sm text-destructive"
                  role="alert"
                >
                  {fieldErrors.title}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Maximum 200 characters.
              </p>
            </div>

            <div className="space-y-1">
              <label
                htmlFor="ticket-description"
                className="block text-sm font-semibold leading-5 text-foreground"
              >
                Description <span aria-hidden="true">*</span>
              </label>
              <textarea
                id="ticket-description"
                name="description"
                required
                value={description}
                onChange={(event) => {
                  setDescription(event.target.value);
                  clearFieldError("description");
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.description)}
                aria-describedby={
                  fieldErrors.description
                    ? "ticket-description-error"
                    : undefined
                }
                placeholder="Include what happened, what you expected, and any steps to reproduce the issue."
                className={textAreaClassName}
              />
              {fieldErrors.description && (
                <p
                  id="ticket-description-error"
                  className="mt-1.5 text-sm text-destructive"
                  role="alert"
                >
                  {fieldErrors.description}
                </p>
              )}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="ticket-type"
                  className="block text-sm font-semibold leading-5 text-foreground"
                >
                  Type
                </label>
                <select
                  id="ticket-type"
                  name="type"
                  value={type}
                  onChange={(event) =>
                    setType(event.target.value as TicketType)
                  }
                  disabled={isSubmitting}
                  className={inputClassName}
                >
                  {TICKET_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ticket-priority"
                  className="block text-sm font-semibold leading-5 text-foreground"
                >
                  Priority
                </label>
                <select
                  id="ticket-priority"
                  name="priority"
                  value={priority}
                  onChange={(event) =>
                    setPriority(event.target.value as TicketPriority)
                  }
                  disabled={isSubmitting}
                  className={inputClassName}
                >
                  {TICKET_PRIORITIES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="ticket-product"
                className="block text-sm font-semibold leading-5 text-foreground"
              >
                Product{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>
              <select
                id="ticket-product"
                name="productId"
                value={productId}
                onChange={(event) => setProductId(event.target.value)}
                disabled={isSubmitting || productsQuery.isLoading}
                className={inputClassName}
              >
                <option value="">
                  {productsQuery.isLoading
                    ? "Loading products..."
                    : "No product"}
                </option>

                {(productsQuery.data ?? [])
                  .filter((product) => product.isActive)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
              </select>

              {productsQuery.isError && (
                <p
                  className="mt-1.5 text-sm text-muted-foreground"
                  role="status"
                >
                  The product list could not be loaded. You can still create the
                  ticket without a product.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="ticket-attachments"
                className="block text-sm font-semibold leading-5 text-foreground"
              >
                Attachments{" "}
                <span className="font-normal text-muted-foreground">
                  (optional)
                </span>
              </label>

              <div className="mt-2 rounded-2xl border border-dashed border-primary/25 bg-surface-muted/30 p-4 sm:p-5">
                <label
                  htmlFor="ticket-attachments"
                  className="flex cursor-pointer items-start gap-3"
                >
                  <Paperclip className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                  <span>
                    <span className="block text-sm font-medium">
                      Select files to attach
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      PDF, images, text/CSV, Word, Excel, and PowerPoint files.
                      Maximum 10 MB per file.
                    </span>
                  </span>
                </label>

                <input
                  id="ticket-attachments"
                  name="attachments"
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  disabled={isSubmitting}
                  onChange={(event) => {
                    setFiles(Array.from(event.currentTarget.files ?? []));
                    clearFieldError("attachments");
                  }}
                  aria-invalid={Boolean(fieldErrors.attachments)}
                  aria-describedby={
                    fieldErrors.attachments
                      ? "ticket-attachments-error"
                      : "ticket-attachments-help"
                  }
                  className="mt-3 block w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:py-2 file:text-xs file:font-semibold file:text-foreground hover:file:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
                />

                <p
                  id="ticket-attachments-help"
                  className="mt-2 text-xs text-muted-foreground"
                >
                  Files are uploaded after the ticket is created.
                </p>

                {files.length > 0 && (
                  <ul
                    className="mt-3 space-y-1 text-sm"
                    aria-label="Selected attachments"
                  >
                    {files.map((file, index) => (
                      <li
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-card px-3 py-2"
                      >
                        <span className="min-w-0 truncate">{file.name}</span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {fieldErrors.attachments && (
                  <p
                    id="ticket-attachments-error"
                    className="mt-2 text-sm text-destructive"
                    role="alert"
                  >
                    {fieldErrors.attachments}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-border/70 pt-6 sm:flex-row sm:justify-end">
              <Link href="/tickets" className={secondaryLinkClassName}>
                Cancel
              </Link>

              <button
                type="submit"
                disabled={isSubmitting}
                className={primaryButtonClassName}
              >
                <TicketIcon className="size-4" />
                {isSubmitting ? "Submitting..." : "Create Ticket"}
              </button>
            </div>

            {isSubmitting && (
              <p className="text-sm text-muted-foreground" role="status">
                Creating the ticket and uploading any selected attachments...
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
