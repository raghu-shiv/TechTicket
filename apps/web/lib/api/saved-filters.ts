import type {
  CreateSavedFilterInput,
  SavedFilter,
  SavedFiltersResponse,
  UpdateSavedFilterInput,
} from "@/types/saved-filters";

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

    if (Array.isArray(error.message)) {
      return error.message.join(", ");
    }

    if (error.message) {
      return error.message;
    }
  } catch {
    // Keep fallback.
  }

  return fallback;
}

function buildHeaders(organizationId: string): HeadersInit {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    "x-organization-id": organizationId,
  };
}

export async function getSavedFilters(
  organizationId: string,
): Promise<SavedFiltersResponse> {
  const response = await fetch(`${API_BASE_URL}/saved-filters`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(organizationId),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch saved filters"),
    );
  }

  return response.json() as Promise<SavedFiltersResponse>;
}

export async function getSavedFilter(
  organizationId: string,
  savedFilterId: string,
): Promise<SavedFilter> {
  const response = await fetch(
    `${API_BASE_URL}/saved-filters/${savedFilterId}`,
    {
      method: "GET",
      credentials: "include",
      headers: buildHeaders(organizationId),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch saved filter"),
    );
  }

  return response.json() as Promise<SavedFilter>;
}

export async function createSavedFilter(
  organizationId: string,
  input: CreateSavedFilterInput,
): Promise<SavedFilter> {
  const response = await fetch(`${API_BASE_URL}/saved-filters`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(organizationId),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to create saved filter"),
    );
  }

  return response.json() as Promise<SavedFilter>;
}

export async function updateSavedFilter(
  organizationId: string,
  savedFilterId: string,
  input: UpdateSavedFilterInput,
): Promise<SavedFilter> {
  const response = await fetch(
    `${API_BASE_URL}/saved-filters/${savedFilterId}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: buildHeaders(organizationId),
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to update saved filter"),
    );
  }

  return response.json() as Promise<SavedFilter>;
}

export interface DeleteSavedFilterResponse {
  success: true;
  savedFilterId: string;
}

export async function deleteSavedFilter(
  organizationId: string,
  savedFilterId: string,
): Promise<DeleteSavedFilterResponse> {
  const response = await fetch(
    `${API_BASE_URL}/saved-filters/${savedFilterId}`,
    {
      method: "DELETE",
      credentials: "include",
      headers: buildHeaders(organizationId),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to delete saved filter"),
    );
  }

  return response.json() as Promise<DeleteSavedFilterResponse>;
}
