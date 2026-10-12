import type { TicketStatus } from "@/types/tickets";
import type { TicketUser } from "@/types/tickets";

export interface TicketLibraryEntry {
  id: string;
  organizationId: string;
  sourceTicketId: string | null;
  title: string;
  problem: string;
  resolution: string;
  productId: string | null;
  tags: string[];
  createdById: string;
  createdAt: string;
  updatedAt: string;
  product: { id: string; name: string; isActive: boolean } | null;
  sourceTicket: {
    id: string;
    ticketNumber: string;
    title: string;
    status: TicketStatus;
  } | null;
  createdBy: TicketUser;
}

export interface TicketLibraryResponse {
  data: TicketLibraryEntry[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CreateTicketLibraryEntryInput {
  title: string;
  problem: string;
  resolution: string;
  productId?: string;
  sourceTicketId?: string;
  tags: string[];
}

export type UpdateTicketLibraryEntryInput = Partial<
  Omit<CreateTicketLibraryEntryInput, "sourceTicketId">
>;
