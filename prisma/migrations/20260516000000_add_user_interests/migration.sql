-- Add missing interests column to User so Prisma login queries can hydrate the full row.
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "interests" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
