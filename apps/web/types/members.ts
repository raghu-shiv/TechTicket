export type OrganizationRole = "OWNER" | "ADMIN" | "AGENT" | "REQUESTER";

export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    image: string | null;
  };
}

export interface AddOrganizationMemberInput {
  email: string;
  role: Exclude<OrganizationRole, "OWNER">;
}

/**
 * Minimal result contract for global user search.
 * `id` is the User ID, not the Membership record ID.
 */
export interface MemberSearchResult {
  id: string;
  displayName: string;
  email: string;
}
