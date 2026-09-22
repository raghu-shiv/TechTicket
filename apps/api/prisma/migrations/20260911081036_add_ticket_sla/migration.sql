-- CreateTable
CREATE TABLE "TicketSla" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "firstResponseDueAt" TIMESTAMP(3) NOT NULL,
    "resolutionDueAt" TIMESTAMP(3) NOT NULL,
    "firstRespondedAt" TIMESTAMP(3),
    "firstResponseBreachedAt" TIMESTAMP(3),
    "resolutionBreachedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSla_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TicketSla_ticketId_key" ON "TicketSla"("ticketId");

-- CreateIndex
CREATE INDEX "TicketSla_firstResponseDueAt_idx" ON "TicketSla"("firstResponseDueAt");

-- CreateIndex
CREATE INDEX "TicketSla_resolutionDueAt_idx" ON "TicketSla"("resolutionDueAt");

-- CreateIndex
CREATE INDEX "TicketSla_firstResponseBreachedAt_idx" ON "TicketSla"("firstResponseBreachedAt");

-- CreateIndex
CREATE INDEX "TicketSla_resolutionBreachedAt_idx" ON "TicketSla"("resolutionBreachedAt");

-- AddForeignKey
ALTER TABLE "TicketSla" ADD CONSTRAINT "TicketSla_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
