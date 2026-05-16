import { Prisma } from "../../../../generated/prisma/client";

export type TSkillPostCreateInput = {
  title: string;
  slug: string;
  category: string;
  tags?: string[];
  shortDescription: string;
  thumbnail?: string;
  teaserAsset?: string;
  roadmapType?: "DAILY" | "HOURLY" | "SEVEN_DAY" | "THIRTY_DAY";
  outcomes?: string[];
  targetAudience?: string;
  prerequisites?: string;
  valueProp?: string;
  longDescription?: string;
  syllabus?: Prisma.InputJsonValue;
  resourceLinks?: string[];
  lockedContent?: Prisma.InputJsonValue;
  tokenPrice: number;
  images?: string[];
};

export type TSkillPostUpdateInput = Partial<TSkillPostCreateInput>;

export type TSkillPostFilters = {
  searchTerm?: string;
  category?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  creatorId?: string;
};
