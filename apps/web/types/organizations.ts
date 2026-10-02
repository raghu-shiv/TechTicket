export interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
}

export interface OrganizationMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: "OWNER" | "ADMIN" | "AGENT" | "REQUESTER";
  organization: Organization;
}

export type OrganizationsResponse = OrganizationMembership[];
