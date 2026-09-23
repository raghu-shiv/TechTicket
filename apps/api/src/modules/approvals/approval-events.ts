export const APPROVAL_EVENTS = {
  REQUESTED: 'approval.requested',
  APPROVED: 'approval.approved',
  REJECTED: 'approval.rejected',
  CANCELLED: 'approval.cancelled',
} as const;

export interface ApprovalActivityEvent {
  approvalId: string;
  ticketId: string;
  ticketNumber: string;
  organizationId: string;
  actorId: string;
  requesterId: string;
  approverId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  comment: string | null;
  occurredAt: Date;
}
