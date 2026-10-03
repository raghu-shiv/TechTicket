"use client";

import { useQuery } from "@tanstack/react-query";

import { getSlaPolicies, getSlaPolicy } from "@/lib/api/sla-policies";

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
