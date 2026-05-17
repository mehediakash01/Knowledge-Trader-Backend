-- Cache AI skill audits on SkillPost so the LLM does not rerun on every page view.
ALTER TABLE "SkillPost"
ADD COLUMN IF NOT EXISTS "aiReviewSentimentScore" INTEGER,
ADD COLUMN IF NOT EXISTS "aiReviewPros" JSONB,
ADD COLUMN IF NOT EXISTS "aiReviewCons" JSONB,
ADD COLUMN IF NOT EXISTS "aiReviewSummary" TEXT,
ADD COLUMN IF NOT EXISTS "aiReviewGeneratedAt" TIMESTAMP(3);
