"use client";

import { useMemo, useState } from "react";
import { Loader2, Save, X } from "lucide-react";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from "@/components/ui";
import {
  SLA_PRIORITIES,
  type CreateSlaPolicyInput,
  type SlaPolicy,
  type SlaPriority,
  type SlaPolicyTargetInput,
  type UpdateSlaPolicyInput,
} from "@/types/sla-policies";
import {
  useCreateSlaPolicy,
  useUpdateSlaPolicy,
} from "@/hooks/use-sla-policies";

interface SlaPolicyFormProps {
  organizationId: string;
  policy?: SlaPolicy;
  onCancel: () => void;
  onSuccess: () => void;
}

interface FormTarget {
  priority: SlaPriority;
  firstResponseMinutes: string;
  resolutionMinutes: string;
}

const priorityLabels: Record<SlaPriority, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  URGENT: "Urgent",
};

function createDefaultTargets(): FormTarget[] {
  return SLA_PRIORITIES.map((priority) => ({
    priority,
    firstResponseMinutes: "",
    resolutionMinutes: "",
  }));
}

function createTargetsFromPolicy(policy: SlaPolicy): FormTarget[] {
  const targetMap = new Map(
    policy.targets.map((target) => [target.priority, target]),
  );

  return SLA_PRIORITIES.map((priority) => {
    const target = targetMap.get(priority);

    return {
      priority,
      firstResponseMinutes:
        target?.firstResponseMinutes !== undefined
          ? String(target.firstResponseMinutes)
          : "",
      resolutionMinutes:
        target?.resolutionMinutes !== undefined
          ? String(target.resolutionMinutes)
          : "",
    };
  });
}

function parsePositiveInteger(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    return null;
  }

  return parsed;
}

function validateForm(
  name: string,
  targets: FormTarget[],
  canEditTargets: boolean,
): string | null {
  if (!name.trim()) {
    return "SLA policy name is required.";
  }

  if (!canEditTargets) {
    return null;
  }

  if (targets.length !== 4) {
    return "Exactly four SLA priority targets are required.";
  }

  for (const target of targets) {
    const firstResponse = parsePositiveInteger(target.firstResponseMinutes);

    const resolution = parsePositiveInteger(target.resolutionMinutes);

    if (firstResponse === null) {
      return `${priorityLabels[target.priority]} first response must be a positive whole number.`;
    }

    if (resolution === null) {
      return `${priorityLabels[target.priority]} resolution must be a positive whole number.`;
    }

    if (firstResponse > resolution) {
      return `${priorityLabels[target.priority]} first response cannot exceed resolution.`;
    }
  }

  return null;
}

function buildTargetPayload(targets: FormTarget[]): SlaPolicyTargetInput[] {
  return targets.map((target) => ({
    priority: target.priority,
    firstResponseMinutes: Number(target.firstResponseMinutes),
    resolutionMinutes: Number(target.resolutionMinutes),
  }));
}

export function SlaPolicyForm({
  organizationId,
  policy,
  onCancel,
  onSuccess,
}: SlaPolicyFormProps) {
  const isEditing = Boolean(policy);
  const isActive = policy?.isActive ?? false;
  const canEditTargets = !isActive;

  const [name, setName] = useState(policy?.name ?? "");
  const [targets, setTargets] = useState<FormTarget[]>(
    policy ? createTargetsFromPolicy(policy) : createDefaultTargets(),
  );
  const [validationError, setValidationError] = useState<string | null>(null);

  const createMutation = useCreateSlaPolicy(
    isEditing ? undefined : organizationId,
  );

  const updateMutation = useUpdateSlaPolicy(
    isEditing ? organizationId : undefined,
  );

  const mutationError = useMemo(() => {
    const error = isEditing ? updateMutation.error : createMutation.error;

    return error instanceof Error ? error.message : null;
  }, [createMutation.error, isEditing, updateMutation.error]);

  const isPending = isEditing
    ? updateMutation.isPending
    : createMutation.isPending;

  function updateTarget(
    priority: SlaPriority,
    field: "firstResponseMinutes" | "resolutionMinutes",
    value: string,
  ) {
    setTargets((current) =>
      current.map((target) =>
        target.priority === priority
          ? {
              ...target,
              [field]: value,
            }
          : target,
      ),
    );

    setValidationError(null);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setValidationError(null);

    const error = validateForm(name, targets, canEditTargets);

    if (error) {
      setValidationError(error);
      return;
    }

    if (isEditing && policy) {
      const input: UpdateSlaPolicyInput = {
        name: name.trim(),
      };

      if (canEditTargets) {
        input.targets = buildTargetPayload(targets);
      }

      try {
        await updateMutation.mutateAsync({
          policyId: policy.id,
          input,
        });

        onSuccess();
      } catch {
        // Mutation error is displayed below the form.
      }

      return;
    }

    const input: CreateSlaPolicyInput = {
      name: name.trim(),
      targets: buildTargetPayload(targets),
    };

    try {
      await createMutation.mutateAsync(input);

      onSuccess();
    } catch {
      // Mutation error is displayed below the form.
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>
              {isEditing ? "Edit SLA Policy" : "Create SLA Policy"}
            </CardTitle>

            <CardDescription className="mt-1">
              {isEditing
                ? isActive
                  ? "You can change the policy name while it is active. Targets are locked until the policy is deactivated."
                  : "Update the policy name and SLA targets."
                : "Configure first-response and resolution targets for every ticket priority."}
            </CardDescription>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onCancel}
            aria-label="Close form"
            disabled={isPending}
          >
            <X className="size-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="sla-policy-name" className="text-sm font-medium">
              Policy name
            </label>

            <Input
              id="sla-policy-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setValidationError(null);
              }}
              placeholder="Standard Support SLA"
              disabled={isPending}
              maxLength={200}
            />
          </div>

          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-semibold">Priority targets</h4>

              <p className="mt-1 text-xs text-muted-foreground">
                First response must be less than or equal to resolution.
              </p>
            </div>

            <div className="overflow-hidden rounded-lg border">
              <div className="hidden grid-cols-[1fr_1fr_1fr] gap-4 border-b bg-muted/30 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid">
                <span>Priority</span>
                <span>First response</span>
                <span>Resolution</span>
              </div>

              {targets.map((target) => (
                <div
                  key={target.priority}
                  className="grid gap-4 border-b px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_1fr_1fr] sm:items-center"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {priorityLabels[target.priority]}
                    </p>

                    <p className="text-xs text-muted-foreground">
                      {target.priority}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor={`${target.priority}-first-response`}
                      className="text-xs text-muted-foreground sm:hidden"
                    >
                      First response
                    </label>

                    <Input
                      id={`${target.priority}-first-response`}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={target.firstResponseMinutes}
                      onChange={(event) =>
                        updateTarget(
                          target.priority,
                          "firstResponseMinutes",
                          event.target.value,
                        )
                      }
                      disabled={!canEditTargets || isPending}
                      placeholder="60"
                    />
                  </div>

                  <div className="space-y-1">
                    <label
                      htmlFor={`${target.priority}-resolution`}
                      className="text-xs text-muted-foreground sm:hidden"
                    >
                      Resolution
                    </label>

                    <Input
                      id={`${target.priority}-resolution`}
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={target.resolutionMinutes}
                      onChange={(event) =>
                        updateTarget(
                          target.priority,
                          "resolutionMinutes",
                          event.target.value,
                        )
                      }
                      disabled={!canEditTargets || isPending}
                      placeholder="240"
                    />
                  </div>
                </div>
              ))}
            </div>

            {!canEditTargets && (
              <p className="text-xs text-muted-foreground">
                This policy is active. Deactivate it before changing SLA
                targets.
              </p>
            )}
          </div>

          {(validationError || mutationError) && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            >
              {validationError ?? mutationError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              type="button"
              onClick={onCancel}
              disabled={isPending}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {isEditing ? "Saving..." : "Creating..."}
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  {isEditing ? "Save Changes" : "Create Policy"}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
