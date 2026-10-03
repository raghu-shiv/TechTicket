"use client";

import { useState } from "react";
import { Bookmark, Plus } from "lucide-react";

import {
  useCreateSavedFilter,
  useSavedFilters,
} from "@/hooks/use-saved-filters";
import {
  hasSavedFilterCriteria,
  searchParamsToSavedFilter,
} from "@/lib/saved-filters";
import type { SavedFilterDefinition, SavedFilter } from "@/types/saved-filters";

import { SavedFilterDialog } from "./SavedFilterDialog";

interface SavedFiltersPanelProps {
  organizationId: string | undefined;
  searchParams: URLSearchParams;
  onApply: (savedFilter: SavedFilter) => void;
}

export function SavedFiltersPanel({
  organizationId,
  searchParams,
  onApply,
}: SavedFiltersPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError } = useSavedFilters(organizationId);
  const createSavedFilter = useCreateSavedFilter(organizationId);

  const currentFilters = searchParamsToSavedFilter(searchParams);
  const canSaveCurrentFilters = hasSavedFilterCriteria(currentFilters);

  function handleSave(input: {
    name: string;
    description?: string;
    filters: SavedFilterDefinition;
  }) {
    createSavedFilter.mutate(input, {
      onSuccess: () => {
        setDialogOpen(false);
      },
    });
  }

  return (
    <>
      <section className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <Bookmark className="h-4 w-4" />

            <div>
              <h2 className="text-sm font-semibold">Saved filters</h2>

              <p className="text-xs text-muted-foreground">
                Reusable ticket search configurations
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            disabled={
              !organizationId ||
              !canSaveCurrentFilters ||
              createSavedFilter.isPending
            }
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Save current filters
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">
              Loading saved filters...
            </p>
          ) : isError ? (
            <p className="text-sm text-destructive">
              Unable to load saved filters.
            </p>
          ) : data?.items.length ? (
            <div className="space-y-2">
              {data.items.map((savedFilter) => (
                <button
                  key={savedFilter.id}
                  type="button"
                  onClick={() => onApply(savedFilter)}
                  className="block w-full rounded-md border px-3 py-2 text-left transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <p className="text-sm font-medium">{savedFilter.name}</p>

                  {savedFilter.description ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {savedFilter.description}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center">
              <p className="text-sm text-muted-foreground">
                No saved filters yet.
              </p>

              {canSaveCurrentFilters ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Save the current ticket filters to create your first saved
                  filter.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Apply at least one ticket filter before saving it.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      <SavedFilterDialog
        open={dialogOpen}
        filters={currentFilters}
        isSaving={createSavedFilter.isPending}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
      />
    </>
  );
}
