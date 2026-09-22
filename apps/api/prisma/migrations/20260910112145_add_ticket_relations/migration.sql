-- CreateEnum
CREATE TYPE "TicketRelationType" AS ENUM ('RELATED', 'DUPLICATE', 'PARENT', 'CHILD', 'BLOCKS', 'BLOCKED_BY');

-- CreateTable
CREATE TABLE "TicketRelation" (
    "id" TEXT NOT NULL,
    "fromTicketId" TEXT NOT NULL,
    "toTicketId" TEXT NOT NULL,
    "type" "TicketRelationType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TicketRelation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketRelation_fromTicketId_idx" ON "TicketRelation"("fromTicketId");

-- CreateIndex
CREATE INDEX "TicketRelation_toTicketId_idx" ON "TicketRelation"("toTicketId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketRelation_fromTicketId_toTicketId_type_key" ON "TicketRelation"("fromTicketId", "toTicketId", "type");

-- AddForeignKey
ALTER TABLE "TicketRelation" ADD CONSTRAINT "TicketRelation_fromTicketId_fkey" FOREIGN KEY ("fromTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketRelation" ADD CONSTRAINT "TicketRelation_toTicketId_fkey" FOREIGN KEY ("toTicketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
