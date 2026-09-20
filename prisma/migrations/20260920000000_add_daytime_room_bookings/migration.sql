-- Migration: add_daytime_room_bookings
-- Date: 2026-09-20
--
-- Creates the DaytimeRoomBooking table for time-based room reservations
-- (day-use rooms, max 12 hours per booking).

CREATE TABLE IF NOT EXISTS "DaytimeRoomBooking" (
  "id"             TEXT             NOT NULL,
  "roomId"         TEXT             NOT NULL,
  "guestName"      TEXT             NOT NULL,
  "guestPhone"     TEXT             NOT NULL DEFAULT '',
  "date"           TEXT             NOT NULL,
  "startTime"      TEXT             NOT NULL,
  "endTime"        TEXT             NOT NULL,
  "totalHours"     DOUBLE PRECISION NOT NULL,
  "roomRate"       DOUBLE PRECISION NOT NULL,
  "totalCost"      DOUBLE PRECISION NOT NULL,
  "paidAmount"     DOUBLE PRECISION NOT NULL DEFAULT 0,
  "paymentStatus"  TEXT             NOT NULL DEFAULT 'PENDING',
  "paymentMethod"  TEXT,
  "notes"          TEXT             NOT NULL DEFAULT '',
  "status"         TEXT             NOT NULL DEFAULT 'UPCOMING',
  "providerId"     TEXT             NOT NULL,
  "createdAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3)     NOT NULL,

  CONSTRAINT "DaytimeRoomBooking_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX IF NOT EXISTS "DaytimeRoomBooking_providerId_idx" ON "DaytimeRoomBooking"("providerId");
CREATE INDEX IF NOT EXISTS "DaytimeRoomBooking_roomId_idx" ON "DaytimeRoomBooking"("roomId");
CREATE INDEX IF NOT EXISTS "DaytimeRoomBooking_guestPhone_idx" ON "DaytimeRoomBooking"("guestPhone");
CREATE INDEX IF NOT EXISTS "DaytimeRoomBooking_date_idx" ON "DaytimeRoomBooking"("date");
CREATE INDEX IF NOT EXISTS "DaytimeRoomBooking_status_idx" ON "DaytimeRoomBooking"("status");
CREATE INDEX IF NOT EXISTS "DaytimeRoomBooking_createdAt_idx" ON "DaytimeRoomBooking"("createdAt");

-- Foreign keys
ALTER TABLE "DaytimeRoomBooking"
  ADD CONSTRAINT "DaytimeRoomBooking_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DaytimeRoomBooking"
  ADD CONSTRAINT "DaytimeRoomBooking_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
