import type {
  CreateSlaPolicyInput,
  SlaPoliciesResponse,
  SlaPolicy,
  SlaPolicyLifecycleResponse,
  UpdateSlaPolicyInput,
} from "@/types/sla-policies";

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

export async function getSlaPolicies(
  organizationId: string,
): Promise<SlaPoliciesResponse> {
  const response = await fetch(`${API_BASE_URL}/sla-policies`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(organizationId),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch SLA policies"),
    );
  }

  return response.json() as Promise<SlaPoliciesResponse>;
}

export async function getSlaPolicy(
  organizationId: string,
  policyId: string,
): Promise<SlaPolicy> {
  const response = await fetch(`${API_BASE_URL}/sla-policies/${policyId}`, {
    method: "GET",
    credentials: "include",
    headers: buildHeaders(organizationId),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to fetch SLA policy"),
    );
  }

  return response.json() as Promise<SlaPolicy>;
}

export async function createSlaPolicy(
  organizationId: string,
  input: CreateSlaPolicyInput,
): Promise<SlaPolicy> {
  const response = await fetch(`${API_BASE_URL}/sla-policies`, {
    method: "POST",
    credentials: "include",
    headers: buildHeaders(organizationId),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to create SLA policy"),
    );
  }

  return response.json() as Promise<SlaPolicy>;
}

export async function updateSlaPolicy(
  organizationId: string,
  policyId: string,
  input: UpdateSlaPolicyInput,
): Promise<SlaPolicy> {
  const response = await fetch(`${API_BASE_URL}/sla-policies/${policyId}`, {
    method: "PATCH",
    credentials: "include",
    headers: buildHeaders(organizationId),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to update SLA policy"),
    );
  }

  return response.json() as Promise<SlaPolicy>;
}

export async function activateSlaPolicy(
  organizationId: string,
  policyId: string,
): Promise<SlaPolicyLifecycleResponse> {
  const response = await fetch(
    `${API_BASE_URL}/sla-policies/${policyId}/activate`,
    {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(organizationId),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to activate SLA policy"),
    );
  }

  return response.json() as Promise<SlaPolicyLifecycleResponse>;
}

export async function deactivateSlaPolicy(
  organizationId: string,
  policyId: string,
): Promise<SlaPolicyLifecycleResponse> {
  const response = await fetch(
    `${API_BASE_URL}/sla-policies/${policyId}/deactivate`,
    {
      method: "POST",
      credentials: "include",
      headers: buildHeaders(organizationId),
    },
  );

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to deactivate SLA policy"),
    );
  }

  return response.json() as Promise<SlaPolicyLifecycleResponse>;
}
