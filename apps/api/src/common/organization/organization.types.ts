export const ORGANIZATION_ROLES = [
  'OWNER',
  'ADMIN',
  'AGENT',
  'REQUESTER',
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];

export interface OrganizationContext {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
}
