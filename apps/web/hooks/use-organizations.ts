"use client";

import { useQuery } from "@tanstack/react-query";

import { getOrganizations } from "@/lib/api/organizations";

export const organizationsQueryKeys = {
  all: ["organizations"] as const,
  list: () => [...organizationsQueryKeys.all, "list"] as const,
};

export function useOrganizations() {
  return useQuery({
    queryKey: organizationsQueryKeys.list(),
    queryFn: getOrganizations,
  });
}
