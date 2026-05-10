import { Prisma } from "../../../../generated/prisma/client";

export type TSkillPostCreateInput = {
  title: string;
  slug: string;
  category: string;
  tags: string[];
  shortDescription: string;
  longDescription: string;
  previewContent: Prisma.InputJsonValue;
  lockedContent: Prisma.InputJsonValue;
  tokenPrice: number;
  images: string[];
};

export type TSkillPostUpdateInput = Partial<TSkillPostCreateInput>;

export type TSkillPostFilters = {
  searchTerm?: string;
  category?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  creatorId?: string;
};
