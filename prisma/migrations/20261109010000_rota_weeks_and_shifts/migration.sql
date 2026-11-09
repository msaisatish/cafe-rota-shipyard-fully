-- CreateTable
CREATE TABLE "rota_weeks" (
    "id" TEXT NOT NULL,
    "weekStart" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rota_weeks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" TEXT NOT NULL,
    "weekId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rota_weeks_weekStart_key" ON "rota_weeks"("weekStart");

-- CreateIndex
CREATE INDEX "shifts_weekId_startsAt_idx" ON "shifts"("weekId", "startsAt");

-- CreateIndex
CREATE INDEX "shifts_memberId_startsAt_idx" ON "shifts"("memberId", "startsAt");

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_weekId_fkey" FOREIGN KEY ("weekId") REFERENCES "rota_weeks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

