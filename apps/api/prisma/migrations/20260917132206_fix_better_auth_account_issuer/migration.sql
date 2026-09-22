-- DropIndex
DROP INDEX "account_issuer_accountId_uidx";

-- AlterTable
ALTER TABLE "account" ALTER COLUMN "issuer" DROP NOT NULL;
