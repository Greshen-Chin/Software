-- Add userCode and bio
ALTER TABLE "User" ADD COLUMN "userCode" TEXT;
ALTER TABLE "User" ADD COLUMN "bio" TEXT;

-- Backfill userCode for existing users
UPDATE "User"
SET "userCode" = substr(md5(random()::text || clock_timestamp()::text), 1, 7)
WHERE "userCode" IS NULL;

-- Enforce not null + unique
ALTER TABLE "User" ALTER COLUMN "userCode" SET NOT NULL;
CREATE UNIQUE INDEX "User_userCode_key" ON "User"("userCode");

-- Friend request enum + table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FriendRequestStatus') THEN
    CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
  END IF;
END $$;

CREATE TABLE "FriendRequest" (
  "id" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "receiverId" TEXT NOT NULL,
  "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FriendRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FriendRequest_senderId_receiverId_key" ON "FriendRequest"("senderId", "receiverId");
CREATE INDEX "FriendRequest_receiverId_idx" ON "FriendRequest"("receiverId");
CREATE INDEX "FriendRequest_senderId_idx" ON "FriendRequest"("senderId");

ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;