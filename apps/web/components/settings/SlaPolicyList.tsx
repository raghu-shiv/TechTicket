"use client";

import { Clock3, ShieldCheck } from "lucide-react";

import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/shared";
import { useSlaPolicies } from "@/hooks/use-sla-policies";
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

function SlaPolicyCard({ policy }: { policy: SlaPolicy }) {
  const targets = sortTargets(policy.targets);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <CardTitle>{policy.name}</CardTitle>

            <CardDescription className="mt-1">
              {policy.targets.length} priority targets
            </CardDescription>
          </div>

          <Badge variant={policy.isActive ? "success" : "secondary"}>
            {policy.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border bg-muted/20 px-4">
          {targets.map((target) => (
            <PolicyTargetRow key={target.id} target={target} />
          ))}
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
  const organizationsQuery = useOrganizations();

  const organizationId = organizationsQuery.data?.[0]?.organizationId;

  const policiesQuery = useSlaPolicies(organizationId);

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

  if (policies.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No SLA policies"
        description="No SLA policies have been configured for this workspace yet."
      />
    );
  }

  return (
    <div className="space-y-4">
      {policies.map((policy) => (
        <SlaPolicyCard key={policy.id} policy={policy} />
      ))}
    </div>
  );
}
