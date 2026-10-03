"use client";

import { useState } from "react";
import { Bookmark, Pencil, Plus } from "lucide-react";

import {
  useCreateSavedFilter,
  useSavedFilters,
  useUpdateSavedFilter,
} from "@/hooks/use-saved-filters";

import {
  hasSavedFilterCriteria,
  searchParamsToSavedFilter,
} from "@/lib/saved-filters";

import type { SavedFilter, SavedFilterDefinition } from "@/types/saved-filters";

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
  const [editingSavedFilter, setEditingSavedFilter] =
    useState<SavedFilter | null>(null);

  const { data, isLoading, isError } = useSavedFilters(organizationId);

  const createSavedFilter = useCreateSavedFilter(organizationId);

  const updateSavedFilter = useUpdateSavedFilter(organizationId);

  const currentFilters = searchParamsToSavedFilter(searchParams);

  const canSaveCurrentFilters = hasSavedFilterCriteria(currentFilters);

  function handleCreate() {
    setEditingSavedFilter(null);
    setDialogOpen(true);
  }

  function handleEdit(savedFilter: SavedFilter) {
    setEditingSavedFilter(savedFilter);
    setDialogOpen(true);
  }

  function handleCloseDialog() {
    if (createSavedFilter.isPending || updateSavedFilter.isPending) {
      return;
    }

    setDialogOpen(false);
    setEditingSavedFilter(null);
  }

  function handleSave(input: {
    name: string;
    description?: string;
    filters: SavedFilterDefinition;
  }) {
    if (editingSavedFilter) {
      updateSavedFilter.mutate(
        {
          savedFilterId: editingSavedFilter.id,
          input,
        },
        {
          onSuccess: () => {
            setDialogOpen(false);
            setEditingSavedFilter(null);
          },
        },
      );

      return;
    }

    createSavedFilter.mutate(input, {
      onSuccess: () => {
        setDialogOpen(false);
      },
    });
  }

  const isSaving = createSavedFilter.isPending || updateSavedFilter.isPending;

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
            onClick={handleCreate}
            disabled={!organizationId || !canSaveCurrentFilters || isSaving}
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
                <div
                  key={savedFilter.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => onApply(savedFilter)}
                    className="min-w-0 flex-1 text-left transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <p className="truncate text-sm font-medium">
                      {savedFilter.name}
                    </p>

                    {savedFilter.description ? (
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {savedFilter.description}
                      </p>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleEdit(savedFilter)}
                    disabled={isSaving}
                    aria-label={`Edit ${savedFilter.name}`}
                    title="Edit saved filter"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
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
        key={editingSavedFilter ? `edit-${editingSavedFilter.id}` : "create"}
        open={dialogOpen}
        mode={editingSavedFilter ? "edit" : "create"}
        initialName={editingSavedFilter?.name ?? ""}
        initialDescription={editingSavedFilter?.description ?? ""}
        filters={editingSavedFilter?.filters ?? currentFilters}
        isSaving={isSaving}
        onClose={handleCloseDialog}
        onSave={handleSave}
      />
    </>
  );
}
