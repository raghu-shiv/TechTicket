/*
  Warnings:

  - A unique constraint covering the columns `[organizationId,ticketNumber]` on the table `Ticket` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Ticket_ticketNumber_key";

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_organizationId_ticketNumber_key" ON "Ticket"("organizationId", "ticketNumber");
