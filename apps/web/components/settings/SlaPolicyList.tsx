"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  XCircle,
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared";
import { SlaPolicyForm } from "@/components/settings/SlaPolicyForm";
import {
  useDeleteSlaPolicy,
  useSlaPolicies,
  useSlaPolicyLifecycle,
} from "@/hooks/use-sla-policies";
import { useOrganizations } from "@/hooks/use-organizations";
import type {
  SlaPolicy,
  SlaPolicyTarget,
  SlaPriority,
} from "@/types/sla-policies";

const priorityConfig: Record<
  SlaPriority,
  {
    label: string;
  }
> = {
  LOW: {
    label: "Low",
  },
  MEDIUM: {
    label: "Medium",
  },
  HIGH: {
    label: "High",
  },
  URGENT: {
    label: "Urgent",
  },
};

const MANAGE_SLA_ROLES = new Set(["OWNER", "ADMIN"]);

function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  return `${hours}h ${remainingMinutes}m`;
}

function sortTargets(targets: SlaPolicyTarget[]): SlaPolicyTarget[] {
  const order: Record<SlaPriority, number> = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    URGENT: 4,
  };

  return [...targets].sort((a, b) => order[a.priority] - order[b.priority]);
}

function PolicyTargetRow({ target }: { target: SlaPolicyTarget }) {
  const config = priorityConfig[target.priority];

  return (
    <div className="grid gap-3 border-t py-3 first:border-t-0 sm:grid-cols-[1fr_1fr_1fr] sm:items-center">
      <div>
        <p className="text-sm font-medium">{config.label}</p>

        <p className="text-xs text-muted-foreground">{target.priority}</p>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <Clock3 className="size-4 text-muted-foreground" />

        <span>
          First response:{" "}
          <span className="font-medium">
            {formatMinutes(target.firstResponseMinutes)}
          </span>
        </span>
      </div>

      <div className="text-sm">
        Resolution:{" "}
        <span className="font-medium">
          {formatMinutes(target.resolutionMinutes)}
        </span>
      </div>
    </div>
  );
}

interface SlaPolicyCardProps {
  policy: SlaPolicy;
  canManage: boolean;
  onEdit: (policy: SlaPolicy) => void;
  onLifecycleAction: (
    policy: SlaPolicy,
    action: "activate" | "deactivate",
  ) => void;
  onDelete: (policy: SlaPolicy) => void;
  isLifecyclePending: boolean;
  isDeletePending: boolean;
  lifecycleError: string | null;
  deleteError: string | null;
  deleteConfirmation: boolean;
  onCancelDeleteConfirmation: () => void;
  confirmation:
    | {
        policyId: string;
        action: "activate" | "deactivate";
      }
    | undefined;
  onCancelConfirmation: () => void;
}

function SlaPolicyCard({
  policy,
  canManage,
  onEdit,
  onLifecycleAction,
  onDelete,
  isLifecyclePending,
  isDeletePending,
  lifecycleError,
  deleteError,
  deleteConfirmation,
  onCancelDeleteConfirmation,
  confirmation,
  onCancelConfirmation,
}: SlaPolicyCardProps) {
  const targets = sortTargets(policy.targets);

  const isConfirming = confirmation?.policyId === policy.id;

  const action = policy.isActive ? "deactivate" : "activate";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{policy.name}</CardTitle>

              <Badge variant={policy.isActive ? "success" : "secondary"}>
                {policy.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>

            <CardDescription className="mt-1">
              {policy.targets.length} priority targets
            </CardDescription>
          </div>

          {canManage && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onEdit(policy)}
                disabled={isLifecyclePending || isDeletePending}
              >
                <Edit3 className="size-4" />
                Edit
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onDelete(policy)}
                disabled={
                  policy.isActive || isLifecyclePending || isDeletePending
                }
                title={
                  policy.isActive
                    ? "Deactivate this policy before deleting it."
                    : "Delete SLA policy"
                }
              >
                {isDeletePending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="size-4" />
                    Delete
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border bg-muted/20 px-4">
          {targets.map((target) => (
            <PolicyTargetRow key={target.id} target={target} />
          ))}
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {policy.isActive ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : (
                <XCircle className="size-4" />
              )}

              <span>
                {policy.isActive
                  ? "This policy is currently used for new tickets."
                  : "This policy is not currently active."}
              </span>
            </div>

            {canManage && (
              <Button
                variant={policy.isActive ? "outline" : "default"}
                size="sm"
                onClick={() => onLifecycleAction(policy, action)}
                disabled={isLifecyclePending}
              >
                {isLifecyclePending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {policy.isActive ? "Deactivating..." : "Activating..."}
                  </>
                ) : (
                  <>
                    <Power className="size-4" />
                    {policy.isActive ? "Deactivate" : "Activate"}
                  </>
                )}
              </Button>
            )}
          </div>

          {canManage && isConfirming && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-sm font-medium">
                {policy.isActive
                  ? "Deactivate this SLA policy?"
                  : "Activate this SLA policy?"}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {policy.isActive
                  ? "New tickets will no longer use this policy until another policy is activated."
                  : "Only one SLA policy can be active for this organization. Activation will fail if another policy is already active."}
              </p>

              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancelConfirmation}
                  disabled={isLifecyclePending}
                >
                  Cancel
                </Button>

                <Button
                  variant={policy.isActive ? "destructive" : "default"}
                  size="sm"
                  onClick={() => onLifecycleAction(policy, confirmation.action)}
                  disabled={isLifecyclePending}
                >
                  {isLifecyclePending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Power className="size-4" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {canManage && lifecycleError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {lifecycleError}
            </div>
          )}

          {canManage && deleteConfirmation && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium">Delete this SLA policy?</p>

              <p className="mt-1 text-xs text-muted-foreground">
                This action permanently removes the policy. It cannot be undone.
              </p>

              <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onCancelDeleteConfirmation}
                  disabled={isDeletePending}
                >
                  Cancel
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete(policy)}
                  disabled={isDeletePending}
                >
                  {isDeletePending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-4" />
                      Delete Policy
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {canManage && deleteError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {deleteError}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="size-4" />

          <span>Policy ID: {policy.id}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SlaPolicyList() {
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<
    string | undefined
  >();
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const [confirmation, setConfirmation] = useState<
    | {
        policyId: string;
        action: "activate" | "deactivate";
      }
    | undefined
  >();

  const organizationsQuery = useOrganizations();

  const membership = organizationsQuery.data?.[0];

  const organizationId = membership?.organizationId;

  const role = membership?.role;

  const canManage = role ? MANAGE_SLA_ROLES.has(role) : false;

  const policiesQuery = useSlaPolicies(organizationId);

  const lifecycleMutation = useSlaPolicyLifecycle(organizationId);

  const deleteMutation = useDeleteSlaPolicy(organizationId);

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
      <EmptyState
        icon={ShieldCheck}
        title="No organization available"
        description="Your account is not currently associated with an organization."
      />
    );
  }

  if (policiesQuery.isLoading) {
    return <LoadingState label="Loading SLA policies..." />;
  }

  if (policiesQuery.isError) {
    return (
      <ErrorState
        title="Unable to load SLA policies"
        description={
          policiesQuery.error instanceof Error
            ? policiesQuery.error.message
            : "We couldn't load the SLA policies."
        }
        onRetry={() => policiesQuery.refetch()}
      />
    );
  }

  const policies = policiesQuery.data ?? [];

  const editingPolicy = editingPolicyId
    ? policies.find((policy) => policy.id === editingPolicyId)
    : undefined;

  const lifecycleError =
    lifecycleMutation.error instanceof Error
      ? lifecycleMutation.error.message
      : null;

  function handleCreateSuccess() {
    setIsCreating(false);
  }

  function handleEditSuccess() {
    setEditingPolicyId(null);
  }

  function requestLifecycleAction(
    policy: SlaPolicy,
    action: "activate" | "deactivate",
  ) {
    if (!canManage || lifecycleMutation.isPending) {
      return;
    }

    setConfirmation({
      policyId: policy.id,
      action,
    });
  }

  async function executeLifecycleAction(
    policy: SlaPolicy,
    action: "activate" | "deactivate",
  ) {
    if (!canManage || lifecycleMutation.isPending) {
      return;
    }

    try {
      await lifecycleMutation.mutateAsync({
        policyId: policy.id,
        action,
      });

      setConfirmation(undefined);
    } catch {
      /*
       * Keep the confirmation and server error visible so the
       * administrator can understand and retry the operation.
       */
    }
  }

  function requestDelete(policy: SlaPolicy) {
    if (
      !canManage ||
      policy.isActive ||
      lifecycleMutation.isPending ||
      deleteMutation.isPending
    ) {
      return;
    }

    setDeleteConfirmation(policy.id);
  }

  async function executeDelete(policy: SlaPolicy) {
    if (!canManage || policy.isActive || deleteMutation.isPending) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(policy.id);

      setDeleteConfirmation(undefined);
    } catch {
      /*
       * Keep the confirmation and server error visible so the
       * administrator can understand and retry the operation.
       */
    }
  }
  const deleteError =
    deleteMutation.error instanceof Error ? deleteMutation.error.message : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Configured policies</h2>

          <p className="text-xs text-muted-foreground">
            SLA policies define first-response and resolution targets.
          </p>
        </div>

        {canManage && !isCreating && !editingPolicyId && (
          <Button
            onClick={() => setIsCreating(true)}
            disabled={lifecycleMutation.isPending}
          >
            <Plus className="size-4" />
            Create SLA Policy
          </Button>
        )}
      </div>

      {!canManage && (
        <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          You have view-only access to SLA policies. Contact an organization
          administrator or owner to create, edit, activate, or deactivate, or
          delete policies.
        </div>
      )}

      {isCreating && canManage && (
        <SlaPolicyForm
          organizationId={organizationId}
          onCancel={() => setIsCreating(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingPolicy && canManage && (
        <SlaPolicyForm
          key={editingPolicy.id}
          organizationId={organizationId}
          policy={editingPolicy}
          onCancel={() => setEditingPolicyId(null)}
          onSuccess={handleEditSuccess}
        />
      )}

      {policies.length === 0 && !isCreating ? (
        <EmptyState
          icon={ShieldCheck}
          title="No SLA policies"
          description="No SLA policies have been configured for this workspace yet."
        />
      ) : (
        <div className="space-y-4">
          {policies.map((policy) => (
            <SlaPolicyCard
              key={policy.id}
              policy={policy}
              canManage={canManage}
              onEdit={(selectedPolicy) => {
                if (
                  !canManage ||
                  lifecycleMutation.isPending ||
                  deleteMutation.isPending
                ) {
                  return;
                }

                setIsCreating(false);
                setEditingPolicyId(selectedPolicy.id);
                setConfirmation(undefined);
                setDeleteConfirmation(undefined);
                lifecycleMutation.reset();
                deleteMutation.reset();
              }}
              onLifecycleAction={(selectedPolicy, action) => {
                if (!canManage || deleteMutation.isPending) {
                  return;
                }

                if (
                  confirmation?.policyId === selectedPolicy.id &&
                  confirmation.action === action
                ) {
                  void executeLifecycleAction(selectedPolicy, action);
                  return;
                }

                requestLifecycleAction(selectedPolicy, action);
              }}
              onDelete={(selectedPolicy) => {
                if (!canManage || selectedPolicy.isActive) {
                  return;
                }

                if (deleteConfirmation === selectedPolicy.id) {
                  void executeDelete(selectedPolicy);
                  return;
                }

                requestDelete(selectedPolicy);
              }}
              isLifecyclePending={
                canManage &&
                lifecycleMutation.isPending &&
                lifecycleMutation.variables?.policyId === policy.id
              }
              isDeletePending={
                canManage &&
                deleteMutation.isPending &&
                deleteMutation.variables === policy.id
              }
              lifecycleError={
                canManage && lifecycleMutation.variables?.policyId === policy.id
                  ? lifecycleError
                  : null
              }
              deleteError={
                canManage && deleteConfirmation === policy.id
                  ? deleteError
                  : null
              }
              deleteConfirmation={canManage && deleteConfirmation === policy.id}
              onCancelDeleteConfirmation={() => {
                if (!deleteMutation.isPending) {
                  setDeleteConfirmation(undefined);
                  deleteMutation.reset();
                }
              }}
              confirmation={canManage ? confirmation : undefined}
              onCancelConfirmation={() => {
                if (!lifecycleMutation.isPending) {
                  setConfirmation(undefined);
                  lifecycleMutation.reset();
                }
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
