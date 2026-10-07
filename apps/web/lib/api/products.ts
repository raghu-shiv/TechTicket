import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "@/types/products";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function getProducts(organizationId: string): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch products");
  }

  return response.json() as Promise<Product[]>;
}

export async function createProduct(
  organizationId: string,
  input: CreateProductInput,
): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-organization-id": organizationId,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to create product");
  }

  return response.json() as Promise<Product>;
}

export async function updateProduct(
  organizationId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-organization-id": organizationId,
    },
    body: JSON.stringify(input),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to update product");
  }

  return response.json() as Promise<Product>;
}

export async function deleteProduct(
  organizationId: string,
  productId: string,
): Promise<{ id: string }> {
  const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to delete product");
  }

  return response.json() as Promise<{ id: string }>;
}
