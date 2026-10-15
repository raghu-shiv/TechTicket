"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { getEligibleStaffMembers } from "@/lib/api/members";
import {
  createTicketComment,
  getTicketComments,
  updateTicketAssignment,
  updateTicketStatus,
} from "@/lib/api/tickets";
import { requestTicketApproval } from "@/lib/api/approvals";
import {
  ticketActivityQueryKeys,
  useTicketActivity,
} from "@/hooks/use-ticket-activity";
import { ticketQueryKeys } from "@/hooks/use-ticket";
import { ticketsQueryKeys } from "@/hooks/use-tickets";
import type { OrganizationRole } from "@/types/members";
import type { Ticket, TicketCommentType, TicketStatus } from "@/types/tickets";

const NEXT_STATUSES: Record<TicketStatus, TicketStatus[]> = {
  OPEN: ["IN_PROGRESS", "PENDING"],
  IN_PROGRESS: ["PENDING", "RESOLVED"],
  PENDING: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  PENDING: "Pending",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TicketWorkflowPanel({
  organizationId,
  ticket,
  currentUserId,
  role,
}: {
  organizationId: string;
  ticket: Ticket;
  currentUserId: string;
  role: OrganizationRole;
}) {
  const queryClient = useQueryClient();
  const canManage = role === "OWNER" || role === "ADMIN" || role === "AGENT";

  const [commentBody, setCommentBody] = useState("");
  const [commentType, setCommentType] = useState<TicketCommentType>("PUBLIC");
  const [approverTarget, setApproverTarget] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [notice, setNotice] = useState("");

  const [statusSelection, setStatusSelection] = useState<{
    baseStatus: TicketStatus;
    target: TicketStatus;
  }>(() => ({
    baseStatus: ticket.status,
    target: NEXT_STATUSES[ticket.status][0] ?? ticket.status,
  }));

  const statusTarget =
    statusSelection.baseStatus === ticket.status
      ? statusSelection.target
      : (NEXT_STATUSES[ticket.status][0] ?? ticket.status);

  const setStatusTarget = (target: TicketStatus) => {
    setStatusSelection({
      baseStatus: ticket.status,
      target,
    });
  };

  const [assigneeSelection, setAssigneeSelection] = useState<{
    baseAssigneeId: string | null;
    target: string;
  }>(() => ({
    baseAssigneeId: ticket.assigneeId,
    target: ticket.assigneeId ?? "",
  }));

  const assigneeTarget =
    assigneeSelection.baseAssigneeId === ticket.assigneeId
      ? assigneeSelection.target
      : (ticket.assigneeId ?? "");

  const setAssigneeTarget = (target: string) => {
    setAssigneeSelection({
      baseAssigneeId: ticket.assigneeId,
      target,
    });
  };

  const staffQuery = useQuery({
    queryKey: ["eligible-staff", organizationId],
    queryFn: () => getEligibleStaffMembers(organizationId),
    enabled: canManage,
  });

  const commentsKey = ["ticket-comments", organizationId, ticket.id] as const;

  const commentsQuery = useQuery({
    queryKey: commentsKey,
    queryFn: () => getTicketComments(organizationId, ticket.id),
  });

  const activityQuery = useTicketActivity(organizationId, ticket.id, {
    page: 1,
    limit: 20,
  });

  async function refreshTicketAndActivity() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ticketQueryKeys.detail(organizationId, ticket.id),
      }),
      queryClient.invalidateQueries({ queryKey: ticketsQueryKeys.all }),
      queryClient.invalidateQueries({
        queryKey: ticketActivityQueryKeys.ticket(organizationId, ticket.id),
      }),
    ]);
  }

  const statusMutation = useMutation({
    mutationFn: () =>
      updateTicketStatus(organizationId, ticket.id, statusTarget),
    onSuccess: async () => {
      setNotice("Ticket status updated.");
      await refreshTicketAndActivity();
    },
  });

  const assignmentMutation = useMutation({
    mutationFn: () =>
      updateTicketAssignment(organizationId, ticket.id, assigneeTarget || null),
    onSuccess: async () => {
      setNotice("Ticket assignment updated.");
      await refreshTicketAndActivity();
    },
  });

  const commentMutation = useMutation({
    mutationFn: () =>
      createTicketComment(organizationId, ticket.id, {
        body: commentBody,
        type: commentType,
      }),
    onSuccess: async () => {
      setCommentBody("");
      setNotice("Comment added.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: commentsKey }),
        refreshTicketAndActivity(),
      ]);
    },
  });

  const approvalMutation = useMutation({
    mutationFn: () =>
      requestTicketApproval(organizationId, ticket.id, {
        approverId: approverTarget,
        ...(approvalComment.trim() ? { comment: approvalComment.trim() } : {}),
      }),
    onSuccess: async () => {
      setApprovalComment("");
      setApproverTarget("");
      setNotice(
        "Approval request created and assigned to the selected staff member.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["approvals"] }),
        refreshTicketAndActivity(),
      ]);
    },
  });

  const staff = staffQuery.data ?? [];
  const possibleApprovers = staff.filter(
    (member) => member.id !== currentUserId && member.id !== ticket.requesterId,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Ticket workflow</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Manage ticket activity and request approvals. Available actions
              are checked again by the API.
            </p>
          </div>

          {notice && (
            <div className="rounded-md border px-3 py-2 text-sm" role="status">
              {notice}
            </div>
          )}

          {canManage && (
            <>
              <section className="space-y-3 border-t pt-5">
                <h3 className="text-sm font-semibold">Change status</h3>
                <form
                  className="flex flex-col gap-3 sm:flex-row"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setNotice("");
                    statusMutation.mutate();
                  }}
                >
                  <select
                    aria-label="New ticket status"
                    value={statusTarget}
                    onChange={(event) =>
                      setStatusTarget(event.target.value as TicketStatus)
                    }
                    className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {NEXT_STATUSES[ticket.status].length === 0 ? (
                      <option value={ticket.status}>
                        {STATUS_LABELS[ticket.status]} (final status)
                      </option>
                    ) : (
                      NEXT_STATUSES[ticket.status].map((status) => (
                        <option key={status} value={status}>
                          {STATUS_LABELS[status]}
                        </option>
                      ))
                    )}
                  </select>
                  <button
                    type="submit"
                    disabled={
                      statusMutation.isPending ||
                      statusTarget === ticket.status ||
                      NEXT_STATUSES[ticket.status].length === 0
                    }
                    className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {statusMutation.isPending ? "Saving..." : "Update status"}
                  </button>
                </form>
                {statusMutation.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {errorText(statusMutation.error, "Status update failed.")}
                  </p>
                )}
              </section>

              <section className="space-y-3 border-t pt-5">
                <h3 className="text-sm font-semibold">Assign ticket</h3>
                {staffQuery.isLoading ? (
                  <p className="text-sm text-muted-foreground">
                    Loading staff members...
                  </p>
                ) : staffQuery.isError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {errorText(
                      staffQuery.error,
                      "Unable to load staff members.",
                    )}
                  </p>
                ) : (
                  <form
                    className="flex flex-col gap-3 sm:flex-row"
                    onSubmit={(event) => {
                      event.preventDefault();
                      setNotice("");
                      assignmentMutation.mutate();
                    }}
                  >
                    <select
                      aria-label="Ticket assignee"
                      value={assigneeTarget}
                      onChange={(event) =>
                        setAssigneeTarget(event.target.value)
                      }
                      className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      disabled={
                        assignmentMutation.isPending ||
                        assigneeTarget === (ticket.assigneeId ?? "")
                      }
                      className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                    >
                      {assignmentMutation.isPending
                        ? "Saving..."
                        : "Save assignment"}
                    </button>
                  </form>
                )}
                <p className="text-xs text-muted-foreground">
                  If the ticket belongs to a team, the assignee must belong to
                  that team. The API enforces this rule.
                </p>
                {assignmentMutation.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {errorText(
                      assignmentMutation.error,
                      "Assignment update failed.",
                    )}
                  </p>
                )}
              </section>

              <section className="space-y-3 border-t pt-5">
                <h3 className="text-sm font-semibold">Request approval</h3>
                <p className="text-sm text-muted-foreground">
                  The request will appear in the selected approver&apos;s inbox,
                  not necessarily your own.
                </p>

                {staffQuery.isSuccess && possibleApprovers.length === 0 && (
                  <p className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                    There is no other eligible staff member to assign this
                    approval to. Add another Owner, Admin, or Agent first.
                  </p>
                )}

                <form
                  className="space-y-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setNotice("");
                    approvalMutation.mutate();
                  }}
                >
                  <select
                    aria-label="Approval approver"
                    value={approverTarget}
                    onChange={(event) => setApproverTarget(event.target.value)}
                    required
                    disabled={
                      !staffQuery.isSuccess ||
                      possibleApprovers.length === 0 ||
                      approvalMutation.isPending
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
                  >
                    <option value="">Select an approver</option>
                    {possibleApprovers.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} ({member.role}) — {member.email}
                      </option>
                    ))}
                  </select>

                  <textarea
                    value={approvalComment}
                    onChange={(event) => setApprovalComment(event.target.value)}
                    maxLength={2000}
                    rows={2}
                    disabled={approvalMutation.isPending}
                    placeholder="Approval context (optional)"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />

                  <button
                    type="submit"
                    disabled={
                      approvalMutation.isPending ||
                      !approverTarget ||
                      possibleApprovers.length === 0
                    }
                    className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {approvalMutation.isPending
                      ? "Requesting..."
                      : "Request approval"}
                  </button>
                </form>

                {approvalMutation.isError && (
                  <p role="alert" className="text-sm text-destructive">
                    {errorText(
                      approvalMutation.error,
                      "Could not request approval.",
                    )}
                  </p>
                )}
              </section>
            </>
          )}

          <section className="space-y-3 border-t pt-5">
            <h3 className="text-sm font-semibold">Comments</h3>

            {commentsQuery.isLoading && (
              <p className="text-sm text-muted-foreground">
                Loading comments...
              </p>
            )}

            {commentsQuery.isError && (
              <p role="alert" className="text-sm text-destructive">
                {errorText(commentsQuery.error, "Unable to load comments.")}
              </p>
            )}

            {commentsQuery.isSuccess && commentsQuery.data.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No comments have been added to this ticket.
              </p>
            )}

            {commentsQuery.data?.map((comment) => (
              <article key={comment.id} className="rounded-md border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{comment.author.name}</p>
                  <div className="flex items-center gap-2">
                    {comment.type === "INTERNAL" && (
                      <Badge variant="secondary">Internal</Badge>
                    )}
                    <time className="text-xs text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </time>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {comment.body}
                </p>
              </article>
            ))}

            <form
              className="space-y-3 border-t pt-4"
              onSubmit={(event) => {
                event.preventDefault();
                setNotice("");
                commentMutation.mutate();
              }}
            >
              <label
                htmlFor={`ticket-comment-${ticket.id}`}
                className="block text-sm font-medium"
              >
                Add a comment
              </label>
              <textarea
                id={`ticket-comment-${ticket.id}`}
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                required
                minLength={1}
                maxLength={10000}
                rows={3}
                placeholder="Write a comment..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />

              {canManage && (
                <select
                  aria-label="Comment visibility"
                  value={commentType}
                  onChange={(event) =>
                    setCommentType(event.target.value as TicketCommentType)
                  }
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="PUBLIC">Public comment</option>
                  <option value="INTERNAL">Internal comment</option>
                </select>
              )}

              <button
                type="submit"
                disabled={commentMutation.isPending || !commentBody.trim()}
                className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {commentMutation.isPending ? "Posting..." : "Post comment"}
              </button>
              {commentMutation.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {errorText(
                    commentMutation.error,
                    "Comment could not be added.",
                  )}
                </p>
              )}
            </form>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div>
            <h2 className="text-base font-semibold">Ticket activity</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Persisted activity history for this ticket.
            </p>
          </div>

          {activityQuery.isLoading && (
            <p className="text-sm text-muted-foreground">Loading activity...</p>
          )}

          {activityQuery.isError && (
            <p role="alert" className="text-sm text-destructive">
              {errorText(
                activityQuery.error,
                "Unable to load ticket activity.",
              )}
            </p>
          )}

          {activityQuery.data?.data.map((activity) => (
            <div key={activity.id} className="border-t pt-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-medium">{activity.description}</p>
                <time className="text-xs text-muted-foreground">
                  {formatDate(activity.createdAt)}
                </time>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {activity.actorPresentation?.displayName ?? "System"}
              </p>
            </div>
          ))}

          {activityQuery.isSuccess && activityQuery.data.data.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No activity has been recorded yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
