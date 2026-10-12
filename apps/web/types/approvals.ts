import type {
  TicketPriority,
  TicketStatus,
  TicketType,
  TicketUser,
} from "@/types/tickets";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type ApprovalInboxFilter = ApprovalStatus | "ALL";

export interface ApprovalInboxItem {
  id: string;
  ticketId: string;
  approverId: string;
  status: ApprovalStatus;
  comment: string | null;
  requestedAt: string;
  approvedAt: string | null;
  rejectedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ticket: {
    id: string;
    ticketNumber: string;
    title: string;
    description: string;
    type: TicketType;
    priority: TicketPriority;
    status: TicketStatus;
    createdAt: string;
    requester: TicketUser;
    product: { id: string; name: string } | null;
  };
}
