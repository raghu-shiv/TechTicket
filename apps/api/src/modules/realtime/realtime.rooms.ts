export const REALTIME_ROOMS = {
  organization: (organizationId: string) => `organization:${organizationId}`,

  ticket: (ticketId: string) => `ticket:${ticketId}`,
} as const;
