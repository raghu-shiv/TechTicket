"use client";

import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package, Pencil, Plus, Trash2 } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui";
import { useOrganizations } from "@/hooks/use-organizations";
import {
  createProduct,
  deleteProduct,
  getProducts,
  updateProduct,
} from "@/lib/api/products";
import type { Product } from "@/types/products";

const productQueryKeys = {
  list: (organizationId: string) => ["products", organizationId] as const,
};

export default function ProductsPage() {
  const organizationsQuery = useOrganizations();
  const membership = organizationsQuery.data?.[0];
  const organizationId = membership?.organizationId;
  const canManage =
    membership?.role === "OWNER" || membership?.role === "ADMIN";
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const queryKey = organizationId
    ? productQueryKeys.list(organizationId)
    : ["products", "disabled"];

  const productsQuery = useQuery({
    queryKey,
    queryFn: () => {
      if (!organizationId) throw new Error("Organization context is required.");
      return getProducts(organizationId);
    },
    enabled: Boolean(organizationId),
  });

  const refreshProducts = () =>
    queryClient.invalidateQueries({ queryKey: ["products", organizationId] });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!organizationId) throw new Error("Organization context is required.");
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
      };
      return editingId
        ? updateProduct(organizationId, editingId, payload)
        : createProduct(organizationId, payload);
    },
    onSuccess: async () => {
      setName("");
      setDescription("");
      setEditingId(null);
      setFormError(null);
      await refreshProducts();
    },
    onError: (error) =>
      setFormError(
        error instanceof Error ? error.message : "Unable to save product.",
      ),
  });

  const lifecycleMutation = useMutation({
    mutationFn: ({
      product,
      isActive,
    }: {
      product: Product;
      isActive: boolean;
    }) => {
      if (!organizationId) throw new Error("Organization context is required.");
      return updateProduct(organizationId, product.id, { isActive });
    },
    onSuccess: refreshProducts,
    onError: (error) =>
      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update product status.",
      ),
  });

  const deleteMutation = useMutation({
    mutationFn: (productId: string) => {
      if (!organizationId) throw new Error("Organization context is required.");
      return deleteProduct(organizationId, productId);
    },
    onSuccess: refreshProducts,
    onError: (error) =>
      setFormError(
        error instanceof Error ? error.message : "Unable to delete product.",
      ),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!name.trim()) {
      setFormError("Product name is required.");
      return;
    }
    if (name.trim().length > 100) {
      setFormError("Product name must be 100 characters or fewer.");
      return;
    }
    if (description.trim().length > 500) {
      setFormError("Description must be 500 characters or fewer.");
      return;
    }
    saveMutation.mutate();
  }

  function beginEdit(product: Product) {
    setEditingId(product.id);
    setName(product.name);
    setDescription(product.description ?? "");
    setFormError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setName("");
    setDescription("");
    setFormError(null);
  }

  if (organizationsQuery.isLoading)
    return <LoadingState label="Loading workspace..." />;
  if (organizationsQuery.isError)
    return (
      <ErrorState
        title="Unable to load workspace"
        description={organizationsQuery.error.message}
        onRetry={() => void organizationsQuery.refetch()}
      />
    );
  if (!organizationId || !membership)
    return (
      <EmptyState
        icon={Package}
        title="No organization available"
        description="Join an organization to view its products."
      />
    );

  const products = productsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="View products associated with tickets. Owners and admins can manage the product catalog."
      />

      {canManage && (
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {editingId ? (
                  <Pencil className="size-5" />
                ) : (
                  <Plus className="size-5" />
                )}
              </div>
              <div>
                <h2 className="text-base font-semibold">
                  {editingId ? "Edit product" : "Add product"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Deactivate products to retain historical reporting context.
                  Deleting is only offered for inactive products with no linked
                  tickets.
                </p>
              </div>
            </div>
            <form
              onSubmit={submit}
              className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-end"
            >
              <div>
                <label htmlFor="product-name" className="text-sm font-medium">
                  Name <span aria-hidden="true">*</span>
                </label>
                <input
                  id="product-name"
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  disabled={saveMutation.isPending}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  placeholder="e.g. ERP"
                />
              </div>
              <div>
                <label
                  htmlFor="product-description"
                  className="text-sm font-medium"
                >
                  Description{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <input
                  id="product-description"
                  maxLength={500}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  disabled={saveMutation.isPending}
                  className="mt-1.5 h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                  placeholder="What this product covers"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {saveMutation.isPending
                    ? "Saving..."
                    : editingId
                      ? "Save changes"
                      : "Add product"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saveMutation.isPending}
                    className="h-10 rounded-md border border-input px-3 text-sm hover:bg-muted"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
            {formError && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {productsQuery.isLoading && <LoadingState label="Loading products..." />}
      {productsQuery.isError && (
        <ErrorState
          title="Unable to load products"
          description={
            productsQuery.error instanceof Error
              ? productsQuery.error.message
              : "The product catalog could not be loaded."
          }
          onRetry={() => void productsQuery.refetch()}
        />
      )}
      {productsQuery.isSuccess && products.length === 0 && (
        <EmptyState
          icon={Package}
          title="No products yet"
          description={
            canManage
              ? "Add the first product to classify ticket workload."
              : "Your organization has not configured any products yet."
          }
        />
      )}
      {productsQuery.isSuccess && products.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b px-5 py-4">
            <h2 className="text-sm font-semibold">Product catalog</h2>
            <Badge variant="secondary">{products.length}</Badge>
          </div>
          <div className="divide-y">
            {products.map((product) => {
              const ticketCount = product._count?.tickets ?? 0;
              return (
                <div
                  key={product.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold">{product.name}</p>
                      <Badge
                        variant={product.isActive ? "success" : "secondary"}
                      >
                        {product.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {product.description || "No description provided."}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ticketCount} linked ticket{ticketCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => beginEdit(product)}
                        className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm hover:bg-muted"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                      <button
                        type="button"
                        disabled={lifecycleMutation.isPending}
                        onClick={() =>
                          lifecycleMutation.mutate({
                            product,
                            isActive: !product.isActive,
                          })
                        }
                        className="h-9 rounded-md border border-input px-3 text-sm hover:bg-muted disabled:opacity-50"
                      >
                        {product.isActive ? "Deactivate" : "Reactivate"}
                      </button>
                      {!product.isActive && ticketCount === 0 && (
                        <button
                          type="button"
                          disabled={deleteMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Permanently delete product “${product.name}”?`,
                              )
                            )
                              deleteMutation.mutate(product.id);
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-md border border-destructive/40 px-3 text-sm text-destructive hover:bg-destructive/5 disabled:opacity-50"
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {(lifecycleMutation.isError || deleteMutation.isError) && (
            <div
              className="border-t bg-destructive/5 px-5 py-3 text-sm text-destructive"
              role="alert"
            >
              {lifecycleMutation.error instanceof Error
                ? lifecycleMutation.error.message
                : deleteMutation.error instanceof Error
                  ? deleteMutation.error.message
                  : "The product operation failed."}
            </div>
          )}
        </Card>
      )}
      <div className="text-xs text-muted-foreground">
        Product writes are authorized again by the API. This interface does not
        replace server-side OWNER/ADMIN checks.
      </div>
    </div>
  );
}
