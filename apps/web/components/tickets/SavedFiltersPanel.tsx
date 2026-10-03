"use client";

import { useState } from "react";
import { Bookmark, Pencil, Plus, Trash2 } from "lucide-react";

import {
  useCreateSavedFilter,
  useDeleteSavedFilter,
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

interface DeleteConfirmationProps {
  savedFilter: SavedFilter | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmation({
  savedFilter,
  isDeleting,
  onCancel,
  onConfirm,
}: DeleteConfirmationProps) {
  if (!savedFilter) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onCancel();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-saved-filter-title"
        aria-describedby="delete-saved-filter-description"
      >
        <div className="mb-5">
          <h2 id="delete-saved-filter-title" className="text-lg font-semibold">
            Delete saved filter?
          </h2>

          <p
            id="delete-saved-filter-description"
            className="mt-2 text-sm text-muted-foreground"
          >
            Are you sure you want to delete{" "}
            <span className="font-medium text-foreground">
              {savedFilter.name}
            </span>
            ? This action cannot be undone.
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />

            {isDeleting ? "Deleting..." : "Delete filter"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function SavedFiltersPanel({
  organizationId,
  searchParams,
  onApply,
}: SavedFiltersPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSavedFilter, setEditingSavedFilter] =
    useState<SavedFilter | null>(null);
  const [deletingSavedFilter, setDeletingSavedFilter] =
    useState<SavedFilter | null>(null);

  const { data, isLoading, isError } = useSavedFilters(organizationId);

  const createSavedFilter = useCreateSavedFilter(organizationId);

  const updateSavedFilter = useUpdateSavedFilter(organizationId);

  const deleteSavedFilter = useDeleteSavedFilter(organizationId);

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

  function handleDelete(savedFilter: SavedFilter) {
    setDeletingSavedFilter(savedFilter);
  }

  function handleCancelDelete() {
    if (deleteSavedFilter.isPending) {
      return;
    }

    setDeletingSavedFilter(null);
  }

  function handleConfirmDelete() {
    if (!deletingSavedFilter) {
      return;
    }

    deleteSavedFilter.mutate(deletingSavedFilter.id, {
      onSuccess: () => {
        setDeletingSavedFilter(null);
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
            disabled={
              !organizationId ||
              !canSaveCurrentFilters ||
              isSaving ||
              deleteSavedFilter.isPending
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
                <div
                  key={savedFilter.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => onApply(savedFilter)}
                    disabled={isSaving || deleteSavedFilter.isPending}
                    className="min-w-0 flex-1 text-left transition hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
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
                    disabled={isSaving || deleteSavedFilter.isPending}
                    aria-label={`Edit ${savedFilter.name}`}
                    title="Edit saved filter"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(savedFilter)}
                    disabled={isSaving || deleteSavedFilter.isPending}
                    aria-label={`Delete ${savedFilter.name}`}
                    title="Delete saved filter"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
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

      <DeleteConfirmation
        savedFilter={deletingSavedFilter}
        isDeleting={deleteSavedFilter.isPending}
        onCancel={handleCancelDelete}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
