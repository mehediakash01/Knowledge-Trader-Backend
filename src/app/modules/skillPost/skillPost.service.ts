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

const createSkillPost = async (
  userId: string,
  payload: TSkillPostCreateInput,
) => {
  const result = await prisma.skillPost.create({
    data: {
      ...payload,
      creatorId: userId,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          reputationScore: true,
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
  const { searchTerm, category, minPrice, maxPrice } = filters;
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
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            reputationScore: true,
          },
        },
        _count: {
          select: {
            reviews: true,
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
    where: {
      id,
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
          reputationScore: true,
          expertise: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Skill post not found");
  }

  const hasCompletedTrade = userId
    ? await prisma.trade.findFirst({
        where: {
          postId: id,
          learnerId: userId,
          status: "COMPLETED",
        },
        select: {
          id: true,
        },
      })
    : null;

  const canAccessLockedContent =
    Boolean(userId) &&
    (result.creatorId === userId || Boolean(hasCompletedTrade));

  if (!canAccessLockedContent) {
    const { lockedContent: _lockedContent, ...publicResult } = result;
    return publicResult;
  }

  return result;
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
      orderBy: {
        tokenPrice: "desc",
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            reputationScore: true,
          },
        },
      },
    }),
    prisma.skillPost.findMany({
      take: 8,
      orderBy: {
        title: "asc",
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            reputationScore: true,
          },
        },
      },
    }),
    getCategories(),
  ]);
  const result = {
    featured,
    latest,
    categories,
  };

  await cache.set(cacheKey, result, 60 * 5);

  return result;
};

const updateSkillPost = async (
  id: string,
  userId: string,
  payload: TSkillPostUpdateInput,
) => {
  const skillPost = await prisma.skillPost.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      creatorId: true,
    },
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
    where: {
      id,
    },
    data: payload,
  });

  await cache.delByPrefix("skill-post:");

  return result;
};

export const SkillPostServices = {
  createSkillPost,
  getAllSkillPosts,
  getSingleSkillPost,
  getCategories,
  getHomeFeed,
  updateSkillPost,
};
