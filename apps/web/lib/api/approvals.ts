import type {
  ApprovalInboxFilter,
  ApprovalInboxItem,
  ApprovalStatus,
} from "@/types/approvals";

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
    // Preserve fallback when the response is not JSON.
  }
  return fallback;
}

export async function getApprovalInbox(
  organizationId: string,
  status: ApprovalInboxFilter = "PENDING",
): Promise<ApprovalInboxItem[]> {
  const url = new URL(`${API_BASE_URL}/approvals`);
  if (status !== "ALL") url.searchParams.set("status", status);

  const response = await fetch(url.toString(), {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await errorMessage(response, "Failed to load approvals."));
  }
  return response.json() as Promise<ApprovalInboxItem[]>;
}

export async function actOnApproval(
  organizationId: string,
  item: Pick<ApprovalInboxItem, "id" | "ticketId">,
  action: "approve" | "reject",
  comment?: string,
): Promise<ApprovalInboxItem> {
  const response = await fetch(
    `${API_BASE_URL}/tickets/${encodeURIComponent(item.ticketId)}/approvals/${encodeURIComponent(item.id)}/${action}`,
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
      body: JSON.stringify({
        ...(comment?.trim() ? { comment: comment.trim() } : {}),
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(
      await errorMessage(response, `Failed to ${action} the approval.`),
    );
  }
  return response.json() as Promise<ApprovalInboxItem>;
}

export const approvalQueryKeys = {
  all: ["approvals"] as const,
  inbox: (organizationId: string, status: ApprovalInboxFilter) =>
    [...approvalQueryKeys.all, "inbox", organizationId, status] as const,
};

export type ApprovalStatusFilter = ApprovalStatus | "ALL";
