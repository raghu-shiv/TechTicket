-- CreateTable
CREATE TABLE "TicketLibraryEntry" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceTicketId" TEXT,
    "title" TEXT NOT NULL,
    "problem" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "productId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketLibraryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TicketLibraryEntry_organizationId_updatedAt_idx" ON "TicketLibraryEntry"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "TicketLibraryEntry_organizationId_productId_idx" ON "TicketLibraryEntry"("organizationId", "productId");

-- AddForeignKey
ALTER TABLE "TicketLibraryEntry" ADD CONSTRAINT "TicketLibraryEntry_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLibraryEntry" ADD CONSTRAINT "TicketLibraryEntry_sourceTicketId_fkey" FOREIGN KEY ("sourceTicketId") REFERENCES "Ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLibraryEntry" ADD CONSTRAINT "TicketLibraryEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketLibraryEntry" ADD CONSTRAINT "TicketLibraryEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
