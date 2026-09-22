-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "TicketType" AS ENUM ('INCIDENT', 'SERVICE_REQUEST', 'QUESTION', 'PROBLEM');

-- CreateTable
CREATE TABLE "Ticket" (
    "id" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "teamId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "priority" "TicketPriority" NOT NULL DEFAULT 'MEDIUM',
    "type" "TicketType" NOT NULL DEFAULT 'INCIDENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_ticketNumber_key" ON "Ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_idx" ON "Ticket"("organizationId");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_status_idx" ON "Ticket"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_priority_idx" ON "Ticket"("organizationId", "priority");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_type_idx" ON "Ticket"("organizationId", "type");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_requesterId_idx" ON "Ticket"("organizationId", "requesterId");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_assigneeId_idx" ON "Ticket"("organizationId", "assigneeId");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_teamId_idx" ON "Ticket"("organizationId", "teamId");

-- CreateIndex
CREATE INDEX "Ticket_organizationId_createdAt_idx" ON "Ticket"("organizationId", "createdAt");

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
