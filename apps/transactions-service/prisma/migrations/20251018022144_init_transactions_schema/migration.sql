-- CreateEnum
CREATE TYPE "transaction_type" AS ENUM ('TRANSFER', 'PIX', 'TED', 'DOC', 'PAYMENT', 'DEPOSIT', 'WITHDRAWAL');

-- CreateEnum
CREATE TYPE "transaction_status" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED');

-- CreateEnum
CREATE TYPE "transaction_event_type" AS ENUM ('CREATED', 'PROCESSING_STARTED', 'BALANCE_VALIDATED', 'BALANCE_UPDATED', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED', 'RETRY_ATTEMPTED');

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "receiverUserId" UUID NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(15,2) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "externalId" VARCHAR(100),
    "type" "transaction_type" NOT NULL DEFAULT 'TRANSFER',
    "status" "transaction_status" NOT NULL DEFAULT 'PENDING',
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "ipAddress" VARCHAR(45),
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    "completedAt" TIMESTAMPTZ(3),
    "cancelledAt" TIMESTAMPTZ(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_events" (
    "id" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "eventType" "transaction_event_type" NOT NULL,
    "oldStatus" "transaction_status",
    "newStatus" "transaction_status",
    "description" TEXT,
    "performedBy" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "transactions_externalId_key" ON "transactions"("externalId");

-- CreateIndex
CREATE INDEX "transactions_senderUserId_idx" ON "transactions"("senderUserId");

-- CreateIndex
CREATE INDEX "transactions_receiverUserId_idx" ON "transactions"("receiverUserId");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_type_idx" ON "transactions"("type");

-- CreateIndex
CREATE INDEX "transactions_createdAt_idx" ON "transactions"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "transactions_senderUserId_status_idx" ON "transactions"("senderUserId", "status");

-- CreateIndex
CREATE INDEX "transactions_receiverUserId_status_idx" ON "transactions"("receiverUserId", "status");

-- CreateIndex
CREATE INDEX "transaction_events_transactionId_idx" ON "transaction_events"("transactionId");

-- CreateIndex
CREATE INDEX "transaction_events_eventType_idx" ON "transaction_events"("eventType");

-- CreateIndex
CREATE INDEX "transaction_events_createdAt_idx" ON "transaction_events"("createdAt" DESC);
