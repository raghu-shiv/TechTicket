"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck, UserPlus, Users, UserX } from "lucide-react";

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
  addMember,
  getMembers,
  removeMember,
  updateMemberRole,
} from "@/lib/api/members";
import type { OrganizationMember, OrganizationRole } from "@/types/members";

const editableRoles: OrganizationRole[] = ["ADMIN", "AGENT", "REQUESTER"];

export default function UsersPage() {
  const organizationsQuery = useOrganizations();
  const membership = organizationsQuery.data?.[0];
  const organizationId = membership?.organizationId;
  const canManage =
    membership?.role === "OWNER" || membership?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [email, setEmail] = useState("");
  const [newRole, setNewRole] =
    useState<Exclude<OrganizationRole, "OWNER">>("REQUESTER");
  const [formError, setFormError] = useState<string | null>(null);
  const queryKey = ["members", organizationId] as const;

  const membersQuery = useQuery({
    queryKey: organizationId ? queryKey : ["members", "disabled"],
    queryFn: () => {
      if (!organizationId) throw new Error("Organization context is required.");
      return getMembers(organizationId);
    },
    enabled: Boolean(organizationId && canManage),
  });

  const refreshMembers = () =>
    queryClient.invalidateQueries({ queryKey: ["members", organizationId] });

  const addMutation = useMutation({
    mutationFn: () => {
      if (!organizationId) throw new Error("Organization context is required.");
      return addMember(organizationId, { email: email.trim(), role: newRole });
    },
    onSuccess: async () => {
      setEmail("");
      setFormError(null);
      await refreshMembers();
    },
    onError: (error) =>
      setFormError(
        error instanceof Error ? error.message : "Unable to add the user.",
      ),
  });

  const roleMutation = useMutation({
    mutationFn: ({
      userId,
      role,
    }: {
      userId: string;
      role: OrganizationRole;
    }) => {
      if (!organizationId) throw new Error("Organization context is required.");
      return updateMemberRole(organizationId, userId, role);
    },
    onSuccess: refreshMembers,
    onError: (error) =>
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update the member role.",
      ),
  });

  const removeMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!organizationId) throw new Error("Organization context is required.");
      return removeMember(organizationId, userId);
    },
    onSuccess: refreshMembers,
    onError: (error) =>
      setFormError(
        error instanceof Error ? error.message : "Unable to remove the member.",
      ),
  });

  function handleAddMember(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!email.trim()) {
      setFormError(
        "Enter the email address of an existing TechTicket account.",
      );
      return;
    }
    addMutation.mutate();
  }

  function handleRemove(member: OrganizationMember) {
    if (member.userId === membership?.userId) return;
    const confirmed = window.confirm(
      `Remove ${member.user.name} (${member.user.email}) from this organization? Their account will not be deleted.`,
    );
    if (confirmed) removeMutation.mutate(member.userId);
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
        icon={Users}
        title="No organization available"
        description="Join an organization to view its user directory."
      />
    );
  if (!canManage) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Users"
          description="Organization member directory and access management."
        />
        <EmptyState
          icon={ShieldCheck}
          title="Administrator access required"
          description="Only organization owners and admins can view the member directory or manage membership. This restriction is also enforced by the API."
        />
      </div>
    );
  }

  const members = membersQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Users"
        description="Manage membership and organization roles. Changes affect only this organization."
      />

      <Card>
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <UserPlus className="size-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Add an existing user</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The current API adds an already registered TechTicket account by
                email. It does not send invitations or create new accounts.
              </p>
            </div>
          </div>
          <form
            onSubmit={handleAddMember}
            className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end"
          >
            <div>
              <label htmlFor="member-email" className="text-sm font-medium">
                Account email
              </label>
              <input
                id="member-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={addMutation.isPending}
                placeholder="person@company.com"
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="member-role" className="text-sm font-medium">
                Role
              </label>
              <select
                id="member-role"
                value={newRole}
                onChange={(event) =>
                  setNewRole(
                    event.target.value as Exclude<OrganizationRole, "OWNER">,
                  )
                }
                disabled={addMutation.isPending}
                className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {editableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              <UserPlus className="size-4" />{" "}
              {addMutation.isPending ? "Adding..." : "Add member"}
            </button>
          </form>
          {formError && (
            <p className="mt-3 text-sm text-destructive" role="alert">
              {formError}
            </p>
          )}
        </CardContent>
      </Card>

      {membersQuery.isLoading && (
        <LoadingState label="Loading organization members..." />
      )}
      {membersQuery.isError && (
        <ErrorState
          title="Unable to load users"
          description={
            membersQuery.error instanceof Error
              ? membersQuery.error.message
              : "The member directory could not be loaded."
          }
          onRetry={() => void membersQuery.refetch()}
        />
      )}
      {membersQuery.isSuccess && members.length === 0 && (
        <EmptyState
          icon={Users}
          title="No members found"
          description="Organization members will appear here."
        />
      )}
      {membersQuery.isSuccess && members.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Organization members</h2>
            <Badge variant="secondary">{members.length}</Badge>
          </div>
          <div className="divide-y">
            {members.map((member) => {
              const isSelf = member.userId === membership.userId;
              const isProtectedOwner =
                membership.role === "ADMIN" && member.role === "OWNER";
              const canEditThisMember = !isSelf && !isProtectedOwner;
              const rolesForCurrentAdmin =
                membership.role === "OWNER"
                  ? (["OWNER", ...editableRoles] as OrganizationRole[])
                  : editableRoles;
              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-medium">
                        {member.user.name || member.user.email}
                      </p>
                      {isSelf && <Badge variant="secondary">You</Badge>}
                      {member.role === "OWNER" && (
                        <Badge variant="outline">Organization owner</Badge>
                      )}
                    </div>
                    <p className="mt-1 break-all text-sm text-muted-foreground">
                      {member.user.email}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Member since{" "}
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(member.createdAt))}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label
                      className="sr-only"
                      htmlFor={`role-${member.userId}`}
                    >
                      Role for {member.user.name}
                    </label>
                    <select
                      id={`role-${member.userId}`}
                      value={member.role}
                      disabled={
                        !canEditThisMember ||
                        roleMutation.isPending ||
                        removeMutation.isPending
                      }
                      onChange={(event) =>
                        roleMutation.mutate({
                          userId: member.userId,
                          role: event.target.value as OrganizationRole,
                        })
                      }
                      className="h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
                    >
                      {rolesForCurrentAdmin.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={
                        isSelf || isProtectedOwner || removeMutation.isPending
                      }
                      onClick={() => handleRemove(member)}
                      title={
                        isSelf
                          ? "You cannot remove yourself"
                          : isProtectedOwner
                            ? "Admins cannot remove an owner"
                            : "Remove member from this organization"
                      }
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive/5 disabled:pointer-events-none disabled:opacity-40"
                    >
                      <UserX className="size-4" /> Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {(roleMutation.isError || removeMutation.isError) && (
            <div
              className="border-t bg-destructive/5 px-5 py-3 text-sm text-destructive"
              role="alert"
            >
              {roleMutation.error instanceof Error
                ? roleMutation.error.message
                : removeMutation.error instanceof Error
                  ? removeMutation.error.message
                  : "The membership change failed."}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
