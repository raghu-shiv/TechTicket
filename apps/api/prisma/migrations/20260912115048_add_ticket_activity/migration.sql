-- CreateEnum
CREATE TYPE "TicketActivityType" AS ENUM ('TICKET_CREATED', 'TICKET_UPDATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'ASSIGNEE_CHANGED', 'TEAM_CHANGED', 'COMMENT_ADDED', 'COMMENT_UPDATED', 'COMMENT_DELETED', 'SLA_FIRST_RESPONSE_BREACHED', 'SLA_RESOLUTION_BREACHED');

-- CreateTable
CREATE TABLE "TicketActivity" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" "TicketActivityType" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketActivity_ticketId_createdAt_idx" ON "TicketActivity"("ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketActivity_organizationId_createdAt_idx" ON "TicketActivity"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "TicketActivity_actorId_idx" ON "TicketActivity"("actorId");

-- CreateIndex
CREATE INDEX "TicketActivity_type_idx" ON "TicketActivity"("type");

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketActivity" ADD CONSTRAINT "TicketActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
