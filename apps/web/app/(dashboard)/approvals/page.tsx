"use client";

import Link from "next/link";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, FileCheck2, RefreshCw, X } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui";
import { useOrganizations } from "@/hooks/use-organizations";
import {
  actOnApproval,
  approvalQueryKeys,
  getApprovalInbox,
} from "@/lib/api/approvals";
import type {
  ApprovalInboxFilter,
  ApprovalInboxItem,
  ApprovalStatus,
} from "@/types/approvals";

const filters: Array<{ value: ApprovalInboxFilter; label: string }> = [
  { value: "PENDING", label: "Pending" },
  { value: "ALL", label: "All statuses" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "CANCELLED", label: "Cancelled" },
];

const statusVariant: Record<
  ApprovalStatus,
  "warning" | "success" | "danger" | "secondary"
> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "secondary",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ApprovalCard({
  item,
  canAct,
  busy,
  comment,
  onCommentChange,
  onAction,
}: {
  item: ApprovalInboxItem;
  canAct: boolean;
  busy: boolean;
  comment: string;
  onCommentChange: (value: string) => void;
  onAction: (action: "approve" | "reject") => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {item.ticket.ticketNumber}
              </span>
              <Badge variant={statusVariant[item.status]}>
                {item.status.replaceAll("_", " ")}
              </Badge>
              <Badge variant="outline">{item.ticket.priority}</Badge>
              <Badge variant="outline">
                {item.ticket.type.replaceAll("_", " ")}
              </Badge>
            </div>
            <h2 className="mt-2 text-base font-semibold">
              {item.ticket.title}
            </h2>
            <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {item.ticket.description}
            </p>
          </div>
          <Link
            href={`/tickets/${encodeURIComponent(item.ticket.id)}`}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-md border border-input px-3 text-sm font-medium hover:bg-muted"
          >
            View ticket <ExternalLink className="size-3.5" />
          </Link>
        </div>

        <div className="grid gap-3 rounded-lg bg-muted/30 p-3 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Requester</p>
            <p className="mt-1 font-medium">{item.ticket.requester.name}</p>
            <p className="break-all text-xs text-muted-foreground">
              {item.ticket.requester.email}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Product</p>
            <p className="mt-1 font-medium">
              {item.ticket.product?.name ?? "No product"}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Requested</p>
            <p className="mt-1 font-medium">{formatDate(item.requestedAt)}</p>
          </div>
        </div>

        {item.comment && (
          <div className="rounded-md border px-3 py-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground">
              Latest approval comment
            </p>
            <p className="mt-1 whitespace-pre-wrap">{item.comment}</p>
          </div>
        )}

        {canAct && item.status === "PENDING" && (
          <div className="space-y-3 border-t pt-4">
            <label
              className="block text-sm font-medium"
              htmlFor={`approval-comment-${item.id}`}
            >
              Comment{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <textarea
              id={`approval-comment-${item.id}`}
              value={comment}
              onChange={(event) => onCommentChange(event.target.value)}
              maxLength={2000}
              rows={2}
              disabled={busy}
              placeholder="Add context for your decision..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
            />
            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction("reject")}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/40 px-3 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
              >
                <X className="size-4" /> Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => onAction("approve")}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                <Check className="size-4" /> Approve
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ApprovalsPage() {
  const organizationsQuery = useOrganizations();
  const membership = organizationsQuery.data?.[0];
  const organizationId = membership?.organizationId;
  const canAct =
    membership?.role === "OWNER" ||
    membership?.role === "ADMIN" ||
    membership?.role === "AGENT";
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<ApprovalInboxFilter>("PENDING");
  const [comments, setComments] = useState<Record<string, string>>({});

  const inboxQuery = useQuery({
    queryKey: organizationId
      ? approvalQueryKeys.inbox(organizationId, filter)
      : [...approvalQueryKeys.all, "disabled"],
    queryFn: () => {
      if (!organizationId) throw new Error("Organization context is required.");
      return getApprovalInbox(organizationId, filter);
    },
    enabled: Boolean(organizationId),
  });

  const actionMutation = useMutation({
    mutationFn: ({
      item,
      action,
      comment,
    }: {
      item: ApprovalInboxItem;
      action: "approve" | "reject";
      comment: string;
    }) => {
      if (!organizationId) throw new Error("Organization context is required.");
      return actOnApproval(organizationId, item, action, comment);
    },
    onSuccess: async (_updated, variables) => {
      setComments((current) => ({ ...current, [variables.item.id]: "" }));
      await queryClient.invalidateQueries({ queryKey: approvalQueryKeys.all });
      await queryClient.invalidateQueries({ queryKey: ["ticket"] });
    },
  });

  if (organizationsQuery.isLoading)
    return <LoadingState label="Loading workspace..." />;
  if (organizationsQuery.isError) {
    return (
      <ErrorState
        title="Unable to load workspace"
        description={organizationsQuery.error.message}
        onRetry={() => void organizationsQuery.refetch()}
      />
    );
  }
  if (!organizationId || !membership) {
    return (
      <EmptyState
        icon={FileCheck2}
        title="No organization available"
        description="Join an organization to view its approval inbox."
      />
    );
  }

  const items = inboxQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Approvals"
        description="Review approval requests assigned to your account in this organization."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">My approval inbox</p>
          <p className="text-xs text-muted-foreground">
            Only requests assigned to your account are shown. The API checks
            approver identity again when an action is submitted.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="approval-status-filter">
            Filter approvals
          </label>
          <select
            id="approval-status-filter"
            value={filter}
            onChange={(event) =>
              setFilter(event.target.value as ApprovalInboxFilter)
            }
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {filters.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            aria-label="Refresh approvals"
            onClick={() => void inboxQuery.refetch()}
            disabled={inboxQuery.isFetching}
            className="inline-flex size-10 items-center justify-center rounded-md border border-input hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw
              className={`size-4 ${inboxQuery.isFetching ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      {actionMutation.isError && (
        <div
          className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm"
          role="alert"
        >
          {actionMutation.error instanceof Error
            ? actionMutation.error.message
            : "The approval action failed."}
        </div>
      )}

      {inboxQuery.isLoading && <LoadingState label="Loading approvals..." />}
      {inboxQuery.isError && (
        <ErrorState
          title="Unable to load approvals"
          description={
            inboxQuery.error instanceof Error
              ? inboxQuery.error.message
              : "The approval inbox could not be loaded."
          }
          onRetry={() => void inboxQuery.refetch()}
        />
      )}
      {inboxQuery.isSuccess && items.length === 0 && (
        <EmptyState
          icon={FileCheck2}
          title={
            filter === "PENDING" ? "No pending approvals" : "No approvals found"
          }
          description={
            filter === "PENDING"
              ? "Requests assigned to you that need a decision will appear here."
              : "There are no approval requests matching this status filter."
          }
        />
      )}
      {inboxQuery.isSuccess && items.length > 0 && (
        <div className="space-y-4">
          {items.map((item) => (
            <ApprovalCard
              key={item.id}
              item={item}
              canAct={canAct && item.approverId === membership.userId}
              busy={actionMutation.isPending}
              comment={comments[item.id] ?? ""}
              onCommentChange={(value) =>
                setComments((current) => ({ ...current, [item.id]: value }))
              }
              onAction={(action) =>
                actionMutation.mutate({
                  item,
                  action,
                  comment: comments[item.id] ?? "",
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
