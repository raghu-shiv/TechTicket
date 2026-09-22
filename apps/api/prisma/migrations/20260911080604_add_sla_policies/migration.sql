-- CreateTable
CREATE TABLE "SlaPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaPolicyTarget" (
    "id" TEXT NOT NULL,
    "policyId" TEXT NOT NULL,
    "priority" "TicketPriority" NOT NULL,
    "firstResponseMinutes" INTEGER NOT NULL,
    "resolutionMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaPolicyTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SlaPolicy_organizationId_idx" ON "SlaPolicy"("organizationId");

-- CreateIndex
CREATE INDEX "SlaPolicy_organizationId_isActive_idx" ON "SlaPolicy"("organizationId", "isActive");

-- CreateIndex
CREATE INDEX "SlaPolicyTarget_policyId_idx" ON "SlaPolicyTarget"("policyId");

-- CreateIndex
CREATE UNIQUE INDEX "SlaPolicyTarget_policyId_priority_key" ON "SlaPolicyTarget"("policyId", "priority");

-- AddForeignKey
ALTER TABLE "SlaPolicy" ADD CONSTRAINT "SlaPolicy_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlaPolicyTarget" ADD CONSTRAINT "SlaPolicyTarget_policyId_fkey" FOREIGN KEY ("policyId") REFERENCES "SlaPolicy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
