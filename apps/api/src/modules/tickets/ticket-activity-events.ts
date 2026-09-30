import { TicketActivityType } from '@prisma/client';

export interface TicketActivityCreatedEvent {
  id: string;
  ticketId: string;
  organizationId: string;
  actorId: string | null;
  type: TicketActivityType;
  metadata: unknown;
  createdAt: Date;
}
