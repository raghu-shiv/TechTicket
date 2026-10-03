"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Edit3,
  Loader2,
  Plus,
  ShieldCheck,
  Power,
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
  onEdit: (policy: SlaPolicy) => void;
  onLifecycleAction: (
    policy: SlaPolicy,
    action: "activate" | "deactivate",
  ) => void;
  isLifecyclePending: boolean;
  lifecycleError: string | null;
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
  onEdit,
  onLifecycleAction,
  isLifecyclePending,
  lifecycleError,
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

          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(policy)}
            disabled={isLifecyclePending}
          >
            <Edit3 className="size-4" />
            Edit
          </Button>
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
          </div>

          {isConfirming && (
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

          {lifecycleError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {lifecycleError}
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

  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const [confirmation, setConfirmation] = useState<
    | {
        policyId: string;
        action: "activate" | "deactivate";
      }
    | undefined
  >();

  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const policiesQuery = useSlaPolicies(organizationId);

  const lifecycleMutation = useSlaPolicyLifecycle(organizationId);

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
    if (lifecycleMutation.isPending) {
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
    if (lifecycleMutation.isPending) {
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
       * Keep the confirmation/error visible so the user can
       * understand and retry after a conflict or server error.
       */
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold">Configured policies</h2>

          <p className="text-xs text-muted-foreground">
            SLA policies define first-response and resolution targets.
          </p>
        </div>

        {!isCreating && !editingPolicyId && (
          <Button
            onClick={() => setIsCreating(true)}
            disabled={lifecycleMutation.isPending}
          >
            <Plus className="size-4" />
            Create SLA Policy
          </Button>
        )}
      </div>

      {isCreating && (
        <SlaPolicyForm
          organizationId={organizationId}
          onCancel={() => setIsCreating(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {editingPolicy && (
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
              onEdit={(selectedPolicy) => {
                if (lifecycleMutation.isPending) {
                  return;
                }

                setIsCreating(false);
                setEditingPolicyId(selectedPolicy.id);
                setConfirmation(undefined);
                lifecycleMutation.reset();
              }}
              onLifecycleAction={(selectedPolicy, action) => {
                if (
                  confirmation?.policyId === selectedPolicy.id &&
                  confirmation.action === action
                ) {
                  void executeLifecycleAction(selectedPolicy, action);

                  return;
                }

                requestLifecycleAction(selectedPolicy, action);
              }}
              isLifecyclePending={
                lifecycleMutation.isPending &&
                lifecycleMutation.variables?.policyId === policy.id
              }
              lifecycleError={
                lifecycleMutation.variables?.policyId === policy.id
                  ? lifecycleError
                  : null
              }
              confirmation={confirmation}
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
