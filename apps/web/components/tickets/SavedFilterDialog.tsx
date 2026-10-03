"use client";

import { FormEvent, useState } from "react";

import type { SavedFilterDefinition } from "@/types/saved-filters";

interface SavedFilterDialogProps {
  open: boolean;
  filters: SavedFilterDefinition;
  isSaving: boolean;
  error?: string;
  onClose: () => void;
  onSave: (input: {
    name: string;
    description?: string;
    filters: SavedFilterDefinition;
  }) => void;
}

export function SavedFilterDialog({
  open,
  filters,
  isSaving,
  error,
  onClose,
  onSave,
}: SavedFilterDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  if (!open) {
    return null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!trimmedName || isSaving) {
      return;
    }

    onSave({
      name: trimmedName,
      ...(trimmedDescription ? { description: trimmedDescription } : {}),
      filters,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-filter-dialog-title"
      >
        <div className="mb-5">
          <h2 id="save-filter-dialog-title" className="text-lg font-semibold">
            Save current filters
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Save the current ticket search and filter configuration for later
            use.
          </p>
        </div>

        {error ? (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="saved-filter-name" className="text-sm font-medium">
              Name
            </label>

            <input
              id="saved-filter-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. High priority open tickets"
              maxLength={100}
              autoFocus
              disabled={isSaving}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="saved-filter-description"
              className="text-sm font-medium"
            >
              Description
              <span className="ml-1 font-normal text-muted-foreground">
                (optional)
              </span>
            </label>

            <textarea
              id="saved-filter-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe when this filter should be used"
              maxLength={500}
              rows={3}
              disabled={isSaving}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={!name.trim() || isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save filter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
