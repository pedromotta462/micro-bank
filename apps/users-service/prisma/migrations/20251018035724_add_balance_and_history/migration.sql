-- CreateEnum
CREATE TYPE "balance_operation_type" AS ENUM ('CREDIT', 'DEBIT', 'ADJUSTMENT', 'INITIAL');

-- AlterTable
ALTER TABLE "banking_details" ADD COLUMN     "balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE "balance_history" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "transactionId" UUID,
    "previousBalance" DECIMAL(15,2) NOT NULL,
    "newBalance" DECIMAL(15,2) NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "type" "balance_operation_type" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "balance_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "balance_history_userId_idx" ON "balance_history"("userId");

-- CreateIndex
CREATE INDEX "balance_history_transactionId_idx" ON "balance_history"("transactionId");

-- CreateIndex
CREATE INDEX "balance_history_createdAt_idx" ON "balance_history"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "banking_details_balance_idx" ON "banking_details"("balance");
