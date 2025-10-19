/*
  Warnings:

  - You are about to drop the column `externalId` on the `transactions` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[idempotencyKey]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."transactions_externalId_key";

-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "externalId",
ADD COLUMN     "idempotencyKey" VARCHAR(100) DEFAULT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_idempotencyKey_key" ON "transactions"("idempotencyKey");
