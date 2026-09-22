-- CreateEnum
CREATE TYPE "TicketApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "TicketApproval" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" "TicketApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketApproval_ticketId_idx" ON "TicketApproval"("ticketId");

-- CreateIndex
CREATE INDEX "TicketApproval_approverId_idx" ON "TicketApproval"("approverId");

-- CreateIndex
CREATE INDEX "TicketApproval_ticketId_status_idx" ON "TicketApproval"("ticketId", "status");

-- CreateIndex
CREATE INDEX "TicketApproval_approverId_status_idx" ON "TicketApproval"("approverId", "status");

-- AddForeignKey
ALTER TABLE "TicketApproval" ADD CONSTRAINT "TicketApproval_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketApproval" ADD CONSTRAINT "TicketApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
