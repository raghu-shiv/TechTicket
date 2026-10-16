import type { Team } from "@/types/teams";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export async function getTeams(organizationId: string): Promise<Team[]> {
  const response = await fetch(`${API_BASE_URL}/teams`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "x-organization-id": organizationId,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    let message = "Failed to load teams.";

    try {
      const error = (await response.json()) as {
        message?: string | string[];
      };

      if (Array.isArray(error.message)) {
        message = error.message.join(", ");
      } else if (typeof error.message === "string" && error.message.trim()) {
        message = error.message;
      }
    } catch {
      // Retain the fallback when the response isn't JSON.
    }

    throw new Error(message);
  }

  return response.json() as Promise<Team[]>;
}
