"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  activateSlaPolicy,
  createSlaPolicy,
  deactivateSlaPolicy,
  getSlaPolicies,
  getSlaPolicy,
  updateSlaPolicy,
} from "@/lib/api/sla-policies";
import type {
  CreateSlaPolicyInput,
  SlaPolicy,
  UpdateSlaPolicyInput,
} from "@/types/sla-policies";

export const slaPolicyQueryKeys = {
  all: ["sla-policies"] as const,

  list: (organizationId: string) =>
    [...slaPolicyQueryKeys.all, "list", organizationId] as const,

  detail: (organizationId: string, policyId: string) =>
    [...slaPolicyQueryKeys.all, "detail", organizationId, policyId] as const,
};

export function useSlaPolicies(organizationId: string | undefined) {
  return useQuery({
    queryKey: organizationId
      ? slaPolicyQueryKeys.list(organizationId)
      : [...slaPolicyQueryKeys.all, "list", "disabled"],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return getSlaPolicies(organizationId);
    },

    enabled: Boolean(organizationId),
  });
}

export function useSlaPolicy(
  organizationId: string | undefined,
  policyId: string | undefined,
) {
  return useQuery({
    queryKey:
      organizationId && policyId
        ? slaPolicyQueryKeys.detail(organizationId, policyId)
        : [...slaPolicyQueryKeys.all, "detail", "disabled"],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      if (!policyId) {
        throw new Error("SLA policy ID is required");
      }

      return getSlaPolicy(organizationId, policyId);
    },

    enabled: Boolean(organizationId && policyId),
  });
}

export function useCreateSlaPolicy(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSlaPolicyInput) => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return createSlaPolicy(organizationId, input);
    },

    onSuccess: (policy) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData<SlaPolicy[]>(
        slaPolicyQueryKeys.list(organizationId),
        (current) => {
          if (!current) {
            return [policy];
          }

          return [...current, policy];
        },
      );

      queryClient.setQueryData(
        slaPolicyQueryKeys.detail(organizationId, policy.id),
        policy,
      );

      queryClient.invalidateQueries({
        queryKey: slaPolicyQueryKeys.list(organizationId),
      });
    },
  });
}

export function useUpdateSlaPolicy(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      policyId,
      input,
    }: {
      policyId: string;
      input: UpdateSlaPolicyInput;
    }) => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return updateSlaPolicy(organizationId, policyId, input);
    },

    onSuccess: (policy) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(
        slaPolicyQueryKeys.detail(organizationId, policy.id),
        policy,
      );

      queryClient.setQueryData<SlaPolicy[]>(
        slaPolicyQueryKeys.list(organizationId),
        (current) => {
          if (!current) {
            return [policy];
          }

          return current.map((item) => (item.id === policy.id ? policy : item));
        },
      );

      queryClient.invalidateQueries({
        queryKey: slaPolicyQueryKeys.list(organizationId),
      });
    },
  });
}

export function useSlaPolicyLifecycle(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      policyId,
      action,
    }: {
      policyId: string;
      action: "activate" | "deactivate";
    }) => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      if (action === "activate") {
        return activateSlaPolicy(organizationId, policyId);
      }

      return deactivateSlaPolicy(organizationId, policyId);
    },

    onSuccess: (policy) => {
      if (!organizationId) {
        return;
      }

      /*
       * The lifecycle endpoints intentionally return a reduced
       * policy representation without targets.
       *
       * Therefore update the cached list's lifecycle state while
       * also invalidating it so the complete policy representation
       * is refetched from the server.
       */
      queryClient.setQueryData<SlaPolicy[]>(
        slaPolicyQueryKeys.list(organizationId),
        (current) => {
          if (!current) {
            return current;
          }

          return current.map((item) =>
            item.id === policy.id
              ? {
                  ...item,
                  name: policy.name,
                  isActive: policy.isActive,
                  updatedAt: policy.updatedAt,
                }
              : item,
          );
        },
      );

      queryClient.invalidateQueries({
        queryKey: slaPolicyQueryKeys.list(organizationId),
      });

      queryClient.invalidateQueries({
        queryKey: slaPolicyQueryKeys.detail(organizationId, policy.id),
      });
    },
  });
}
