/*
  Warnings:

  - The values [CHILD,BLOCKED_BY] on the enum `TicketRelationType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "TicketRelationType_new" AS ENUM ('RELATED', 'DUPLICATE', 'PARENT', 'BLOCKS');
ALTER TABLE "TicketRelation" ALTER COLUMN "type" TYPE "TicketRelationType_new" USING ("type"::text::"TicketRelationType_new");
ALTER TYPE "TicketRelationType" RENAME TO "TicketRelationType_old";
ALTER TYPE "TicketRelationType_new" RENAME TO "TicketRelationType";
DROP TYPE "public"."TicketRelationType_old";
COMMIT;
