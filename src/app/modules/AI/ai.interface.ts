import { z } from "zod";

export type TAIProviderName = "gemini" | "groq" | "openrouter" | "mock";

export type TAIGatewayResponse<T> = {
  success: true;
  provider: TAIProviderName;
  data: T;
};

export type TAIStructuredSchema<T> = z.ZodType<T>;

export type TSkillMatchRequest = Record<string, never>;

export type TSkillAIReview = {
  sentimentScore: number;
  pros: string[];
  cons: string[];
  summary: string;
};

export type TSkillAIReviewResponse = {
  review: TSkillAIReview | null;
  warning?: string;
  cachedAt?: string | null;
  generatedAt?: string | null;
  hasCachedReview: boolean;
};

export type TCourseArchitectRequest = {
  prompt: string;
};

export type TConsultantRequest = {
  goal?: string;
  trends?: string[];
};

export type TTradeValueRequest = {
  offeredSkillId: string;
  requestedSkillId: string;
};

export type TAnalyticsRequest = Record<string, never>;

export type TSyllabusRequest = {
  title: string;
  roadmapType: "DAILY" | "HOURLY" | "SEVEN_DAY" | "THIRTY_DAY";
  category?: string;
  shortDescription?: string;
};
