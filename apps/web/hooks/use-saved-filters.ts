"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createSavedFilter,
  deleteSavedFilter,
  getSavedFilter,
  getSavedFilters,
  updateSavedFilter,
} from "@/lib/api/saved-filters";
import type {
  CreateSavedFilterInput,
  UpdateSavedFilterInput,
} from "@/types/saved-filters";

export const savedFiltersQueryKeys = {
  all: ["saved-filters"] as const,

  list: (organizationId: string) =>
    [...savedFiltersQueryKeys.all, "list", organizationId] as const,

  detail: (organizationId: string, savedFilterId: string) =>
    [
      ...savedFiltersQueryKeys.all,
      "detail",
      organizationId,
      savedFilterId,
    ] as const,
};

export function useSavedFilters(organizationId: string | undefined) {
  return useQuery({
    queryKey: organizationId
      ? savedFiltersQueryKeys.list(organizationId)
      : [...savedFiltersQueryKeys.all, "list", "disabled"],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return getSavedFilters(organizationId);
    },

    enabled: Boolean(organizationId),
  });
}

export function useSavedFilter(
  organizationId: string | undefined,
  savedFilterId: string | undefined,
) {
  return useQuery({
    queryKey:
      organizationId && savedFilterId
        ? savedFiltersQueryKeys.detail(organizationId, savedFilterId)
        : [...savedFiltersQueryKeys.all, "detail", "disabled"],

    queryFn: () => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      if (!savedFilterId) {
        throw new Error("Saved filter ID is required");
      }

      return getSavedFilter(organizationId, savedFilterId);
    },

    enabled: Boolean(organizationId && savedFilterId),
  });
}

export function useCreateSavedFilter(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateSavedFilterInput) => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return createSavedFilter(organizationId, input);
    },

    onSuccess: () => {
      if (!organizationId) {
        return;
      }

      return queryClient.invalidateQueries({
        queryKey: savedFiltersQueryKeys.list(organizationId),
      });
    },
  });
}

export function useUpdateSavedFilter(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      savedFilterId,
      input,
    }: {
      savedFilterId: string;
      input: UpdateSavedFilterInput;
    }) => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return updateSavedFilter(organizationId, savedFilterId, input);
    },

    onSuccess: (savedFilter) => {
      if (!organizationId) {
        return;
      }

      queryClient.setQueryData(
        savedFiltersQueryKeys.detail(organizationId, savedFilter.id),
        savedFilter,
      );

      return queryClient.invalidateQueries({
        queryKey: savedFiltersQueryKeys.list(organizationId),
      });
    },
  });
}

export function useDeleteSavedFilter(organizationId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (savedFilterId: string) => {
      if (!organizationId) {
        throw new Error("Organization context is required");
      }

      return deleteSavedFilter(organizationId, savedFilterId);
    },

    onSuccess: (_result, savedFilterId) => {
      if (!organizationId) {
        return;
      }

      queryClient.removeQueries({
        queryKey: savedFiltersQueryKeys.detail(organizationId, savedFilterId),
      });

      return queryClient.invalidateQueries({
        queryKey: savedFiltersQueryKeys.list(organizationId),
      });
    },
  });
}
