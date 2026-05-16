import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { prisma } from "../../../../lib/prisma";
import AppError from "../../../errors/AppError";
import { paginationHelper } from "../../../helpers/paginationHelper";
import { cache } from "../../../shared/cache";
import {
  TSkillPostCreateInput,
  TSkillPostFilters,
  TSkillPostUpdateInput,
} from "./skillPost.interface";

type TPaginationOptions = {
  page?: number | string;
  limit?: number | string;
  sortBy?: string;
  sortOrder?: string;
};

// ─── Locked field names to strip from public responses ────────────────────────
const VAULT_FIELDS = ["syllabus", "longDescription", "resourceLinks", "lockedContent"] as const;

const clearAiReviewCache = {
  aiReviewSentimentScore: null,
  aiReviewPros: null,
  aiReviewCons: null,
  aiReviewSummary: null,
  aiReviewGeneratedAt: null,
};

const createSkillPost = async (
  userId: string,
  payload: TSkillPostCreateInput,
) => {
  // Extract custom vault fields that don't belong to the Prisma model directly
  // and properly embed them inside lockedContent, or just omit them from payload.
  const { vaultContentType, vaultVideo, vaultPdf, vaultCodeLink, vaultCodeDescription, ...validPayload } = payload as any;
  
  const result = await prisma.skillPost.create({
    data: {
      ...validPayload,
      creatorId: userId,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          reputationScore: true,
          image: true,
        },
      },
    },
  });

  await cache.delByPrefix("skill-post:");

  return result;
};

const getAllSkillPosts = async (
  filters: TSkillPostFilters,
  options: TPaginationOptions,
) => {
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelper.calculatePagination(options);
  const { searchTerm, category, minPrice, maxPrice, creatorId } = filters;
  const andConditions: Prisma.SkillPostWhereInput[] = [];

  if (searchTerm) {
    andConditions.push({
      OR: [
        {
          title: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          category: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
        {
          shortDescription: {
            contains: searchTerm,
            mode: "insensitive",
          },
        },
      ],
    });
  }

  if (category) {
    const categories = category
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (categories.length === 1) {
      andConditions.push({
        category: {
          equals: categories[0],
          mode: "insensitive",
        },
      });
    } else if (categories.length > 1) {
      andConditions.push({
        OR: categories.map((item) => ({
          category: {
            equals: item,
            mode: "insensitive",
          },
        })),
      });
    }
  }

  if (minPrice || maxPrice) {
    andConditions.push({
      tokenPrice: {
        ...(minPrice ? { gte: Number(minPrice) } : {}),
        ...(maxPrice ? { lte: Number(maxPrice) } : {}),
      },
    });
  }

  if (creatorId) {
    andConditions.push({
      creatorId,
    });
  }

  const whereConditions: Prisma.SkillPostWhereInput = andConditions.length
    ? { AND: andConditions }
    : {};

  const [data, total] = await Promise.all([
    prisma.skillPost.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        tags: true,
        shortDescription: true,
        thumbnail: true,
        teaserAsset: true,
        roadmapType: true,
        outcomes: true,
        targetAudience: true,
        valueProp: true,
        tokenPrice: true,
        images: true,
        creatorId: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            reputationScore: true,
            image: true,
          },
        },
        _count: {
          select: {
            reviews: true,
            questions: true,
          },
        },
      },
    }),
    prisma.skillPost.count({
      where: whereConditions,
    }),
  ]);

  return {
    meta: {
      page,
      limit,
      total,
    },
    data,
  };
};

const getSingleSkillPost = async (id: string, userId?: string) => {
  const result = await prisma.skillPost.findUnique({
    where: { id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          reputationScore: true,
          expertise: true,
          image: true,
        },
      },
      _count: {
        select: {
          reviews: true,
          questions: true,
        },
      },
      questions: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          asker: {
            select: { id: true, name: true, image: true },
          },
          answerer: {
            select: { id: true, name: true, image: true },
          },
        },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          user: {
            select: { id: true, name: true, image: true },
          },
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Skill post not found");
  }

  const [hasCompletedTrade, hasReviewed] = await Promise.all([
    userId
      ? prisma.trade.findFirst({
          where: { postId: id, learnerId: userId, status: "COMPLETED" },
          select: { id: true },
        })
      : Promise.resolve(null),
    userId
      ? prisma.review.findFirst({
          where: { postId: id, userId },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const canAccessLockedContent =
    Boolean(userId) &&
    (result.creatorId === userId || Boolean(hasCompletedTrade));

  const responseData = {
    ...result,
    reviews: result.reviews?.map(({ user, ...review }) => ({
      ...review,
      reviewer: user,
    })),
    isAccessible: canAccessLockedContent,
    isOwned: result.creatorId === userId,
    hasReviewed: Boolean(hasReviewed),
  };

  // Strip vault fields from unauthorized users
  if (!canAccessLockedContent) {
    const publicData = { ...responseData } as Record<string, unknown>;
    for (const field of VAULT_FIELDS) {
      delete publicData[field];
    }
    return publicData;
  }

  return responseData;
};

const getCategories = async () => {
  const cacheKey = "skill-post:categories";
  const cached = await cache.get<string[]>(cacheKey);

  if (cached) {
    return cached;
  }

  const categories = await prisma.skillPost.findMany({
    distinct: ["category"],
    orderBy: {
      category: "asc",
    },
    select: {
      category: true,
    },
  });
  const result = categories.map((item) => item.category);

  await cache.set(cacheKey, result, 60 * 30);

  return result;
};

const getHomeFeed = async () => {
  const cacheKey = "skill-post:home-feed";
  const cached = await cache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const [featured, latest, categories] = await Promise.all([
    prisma.skillPost.findMany({
      take: 8,
      orderBy: { tokenPrice: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        shortDescription: true,
        thumbnail: true,
        teaserAsset: true,
        outcomes: true,
        roadmapType: true,
        tokenPrice: true,
        images: true,
        createdAt: true,
        creator: {
          select: { id: true, name: true, reputationScore: true, image: true },
        },
        _count: { select: { reviews: true } },
      },
    }),
    prisma.skillPost.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        category: true,
        shortDescription: true,
        thumbnail: true,
        teaserAsset: true,
        outcomes: true,
        roadmapType: true,
        tokenPrice: true,
        images: true,
        createdAt: true,
        creator: {
          select: { id: true, name: true, reputationScore: true, image: true },
        },
        _count: { select: { reviews: true } },
      },
    }),
    getCategories(),
  ]);

  const result = { featured, latest, categories };
  await cache.set(cacheKey, result, 60 * 5);

  return result;
};

const updateSkillPost = async (
  id: string,
  userId: string,
  payload: TSkillPostUpdateInput,
) => {
  const skillPost = await prisma.skillPost.findUnique({
    where: { id },
    select: { id: true, creatorId: true },
  });

  if (!skillPost) {
    throw new AppError(httpStatus.NOT_FOUND, "Skill post not found");
  }

  if (skillPost.creatorId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "You can only update your own skill posts",
    );
  }

  const result = await prisma.skillPost.update({
    where: { id },
    data: {
      ...payload,
      ...(Object.keys(payload).length > 0 ? clearAiReviewCache : {}),
    },
  });

  await cache.delByPrefix("skill-post:");

  return result;
};

// ─── Seller Q&A ────────────────────────────────────────────────────────────────

const createQuestion = async (
  postId: string,
  askerId: string,
  body: string,
) => {
  const post = await prisma.skillPost.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    throw new AppError(httpStatus.NOT_FOUND, "Skill post not found");
  }

  return prisma.question.create({
    data: { postId, askerId, body },
    include: {
      asker: { select: { id: true, name: true, image: true } },
    },
  });
};

const answerQuestion = async (
  questionId: string,
  userId: string,
  answer: string,
) => {
  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: { post: { select: { creatorId: true } } },
  });

  if (!question) {
    throw new AppError(httpStatus.NOT_FOUND, "Question not found");
  }

  if (question.post.creatorId !== userId) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "Only the skill owner can answer questions",
    );
  }

  return prisma.question.update({
    where: { id: questionId },
    data: {
      answer,
      answeredBy: userId,
      answeredAt: new Date(),
    },
    include: {
      asker: { select: { id: true, name: true, image: true } },
      answerer: { select: { id: true, name: true, image: true } },
    },
  });
};

const getQuestionsForPost = async (postId: string, page = 1, limit = 10) => {
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    prisma.question.findMany({
      where: { postId },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        asker: { select: { id: true, name: true, image: true } },
        answerer: { select: { id: true, name: true, image: true } },
      },
    }),
    prisma.question.count({ where: { postId } }),
  ]);

  return { meta: { page, limit, total }, data };
};

export const SkillPostServices = {
  createSkillPost,
  getAllSkillPosts,
  getSingleSkillPost,
  getCategories,
  getHomeFeed,
  updateSkillPost,
  createQuestion,
  answerQuestion,
  getQuestionsForPost,
};
