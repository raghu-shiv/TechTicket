import type {
  CreateProductInput,
  Product,
  UpdateProductInput,
} from "@/types/products";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getErrorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const error = (await response.json()) as {
      message?: string | string[];
    };

    if (Array.isArray(error.message) && error.message.length > 0) {
      return error.message.join(", ");
    }

    if (typeof error.message === "string" && error.message.trim()) {
      return error.message;
    }
  } catch {
    // Keep the fallback for non-JSON error responses.
  }

  return fallback;
}

async function productRequest<T>(
  organizationId: string,
  path: string,
  init: RequestInit,
  fallback: string,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await getErrorMessage(response, fallback));
  }

  return response.json() as Promise<T>;
}

export function getProducts(organizationId: string): Promise<Product[]> {
  return productRequest(
    organizationId,
    "/products",
    { method: "GET" },
    "Failed to fetch products.",
  );
}

export function createProduct(
  organizationId: string,
  input: CreateProductInput,
): Promise<Product> {
  return productRequest(
    organizationId,
    "/products",
    { method: "POST", body: JSON.stringify(input) },
    "Failed to create product.",
  );
}

export function updateProduct(
  organizationId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<Product> {
  return productRequest(
    organizationId,
    `/products/${encodeURIComponent(productId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
    "Failed to update product.",
  );
}

export function deleteProduct(
  organizationId: string,
  productId: string,
): Promise<{ id: string }> {
  return productRequest(
    organizationId,
    `/products/${encodeURIComponent(productId)}`,
    { method: "DELETE" },
    "Failed to delete product.",
  );
}
