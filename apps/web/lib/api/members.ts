import type {
  AddOrganizationMemberInput,
  OrganizationMember,
  OrganizationRole,
} from "@/types/members";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function errorMessage(
  response: Response,
  fallback: string,
): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (typeof body.message === "string" && body.message.trim())
      return body.message;
  } catch {
    // Preserve fallback when response is not JSON.
  }
  return fallback;
}

async function memberRequest<T>(
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
  if (!response.ok) throw new Error(await errorMessage(response, fallback));
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getMembers(
  organizationId: string,
): Promise<OrganizationMember[]> {
  return memberRequest(
    organizationId,
    "/members",
    { method: "GET" },
    "Failed to load organization members.",
  );
}

export function addMember(
  organizationId: string,
  input: AddOrganizationMemberInput,
): Promise<OrganizationMember> {
  return memberRequest(
    organizationId,
    "/members",
    { method: "POST", body: JSON.stringify(input) },
    "Unable to add this user. The account must already exist.",
  );
}

export function updateMemberRole(
  organizationId: string,
  userId: string,
  role: OrganizationRole,
): Promise<OrganizationMember> {
  return memberRequest(
    organizationId,
    `/members/${encodeURIComponent(userId)}`,
    { method: "PATCH", body: JSON.stringify({ role }) },
    "Failed to update the member role.",
  );
}

export function removeMember(
  organizationId: string,
  userId: string,
): Promise<{ success: boolean; userId: string; organizationId: string }> {
  return memberRequest(
    organizationId,
    `/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
    "Failed to remove the member.",
  );
}
