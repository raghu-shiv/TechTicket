-- CreateEnum
CREATE TYPE "SlaEscalationType" AS ENUM ('FIRST_RESPONSE_BREACH', 'RESOLUTION_BREACH');

-- CreateTable
CREATE TABLE "SlaEscalation" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "ticketSlaId" TEXT NOT NULL,
    "type" "SlaEscalationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlaEscalation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlaEscalation_ticketId_idx" ON "SlaEscalation"("ticketId");

-- CreateIndex
CREATE INDEX "SlaEscalation_ticketSlaId_idx" ON "SlaEscalation"("ticketSlaId");

-- CreateIndex
CREATE UNIQUE INDEX "SlaEscalation_ticketSlaId_type_key" ON "SlaEscalation"("ticketSlaId", "type");

-- AddForeignKey
ALTER TABLE "SlaEscalation" ADD CONSTRAINT "SlaEscalation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaEscalation" ADD CONSTRAINT "SlaEscalation_ticketSlaId_fkey" FOREIGN KEY ("ticketSlaId") REFERENCES "TicketSla"("id") ON DELETE CASCADE ON UPDATE CASCADE;
