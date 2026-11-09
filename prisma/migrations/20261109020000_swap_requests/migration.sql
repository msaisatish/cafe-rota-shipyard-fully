-- CreateTable
CREATE TABLE "swap_requests" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "fromMemberId" TEXT NOT NULL,
    "toMemberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'waiting',
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "swap_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "swap_requests_status_createdAt_idx" ON "swap_requests"("status", "createdAt");

-- CreateIndex
CREATE INDEX "swap_requests_fromMemberId_createdAt_idx" ON "swap_requests"("fromMemberId", "createdAt");

-- CreateIndex
CREATE INDEX "swap_requests_shiftId_status_idx" ON "swap_requests"("shiftId", "status");

-- AddForeignKey
ALTER TABLE "swap_requests" ADD CONSTRAINT "swap_requests_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

