import httpStatus from "http-status";
import { Prisma } from "../../../../generated/prisma/client";
import { Role } from "../../../../generated/prisma/enums";
import { prisma } from "../../../../lib/prisma";
import AppError from "../../../errors/AppError";
import { paginationHelper } from "../../../helpers/paginationHelper";

type TListOptions = {
  page?: number | string;
  limit?: number | string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
};

type TUserAction = {
  role?: Role;
  status?: "ACTIVE" | "SUSPENDED" | "BANNED";
};

const userSortFields = new Set(["name", "email", "role", "status", "tokenBalance"]);
const postSortFields = new Set(["title", "category", "tokenPrice", "moderationStatus", "createdAt"]);
const disputeSortFields = new Set(["createdAt", "updatedAt", "status"]);

const safeSortBy = (value: string, allowed: Set<string>, fallback: string) =>
  allowed.has(value) ? value : fallback;

const getOverview = async () => {
  const [
    totalActiveUsers,
    totalActiveBazaarSkillPosts,
    totalCompletedBarterTransactions,
    tokenAggregate,
    registrations,
    categories,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE" } }),
    prisma.skillPost.count({ where: { moderationStatus: { not: "TAKEN_DOWN" } } }),
    prisma.barterRequest.count({ where: { status: "ACCEPTED" } }),
    prisma.user.aggregate({ _sum: { tokenBalance: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    prisma.skillPost.groupBy({
      by: ["category"],
      _count: { category: true },
      orderBy: { _count: { category: "desc" } },
      take: 5,
    }),
  ]);

  const registrationSeries = registrations.reduce<
    { date: string; registrations: number }[]
  >((series, user) => {
    const label = user.createdAt.toISOString().slice(0, 10);
    const current = series.find((item) => item.date === label);

    if (current) {
      current.registrations += 1;
    } else {
      series.push({ date: label, registrations: 1 });
    }

    return series;
  }, []);

  return {
    totals: {
      totalActiveUsers,
      totalActiveBazaarSkillPosts,
      totalCompletedBarterTransactions,
      totalCirculatingTokenPoolVolume: tokenAggregate._sum.tokenBalance || 0,
    },
    registrationSeries,
    topBarteredCategories: categories.map((item) => ({
      category: item.category,
      barters: item._count.category,
    })),
  };
};

const listUsers = async (options: TListOptions) => {
  const { page, limit, skip, sortOrder } =
    paginationHelper.calculatePagination(options);
  const sortBy = safeSortBy(String(options.sortBy || ""), userSortFields, "name");
  const search = String(options.search || "").trim();
  const roleSearch = search.toUpperCase();
  const userSearchConditions: Prisma.UserWhereInput[] = [
    { name: { contains: search, mode: "insensitive" } },
    { email: { contains: search, mode: "insensitive" } },
  ];

  if (roleSearch === "USER" || roleSearch === "ADMIN" || roleSearch === "MANAGER") {
    userSearchConditions.push({ role: roleSearch as Role });
  }

  const where: Prisma.UserWhereInput = search
    ? { OR: userSearchConditions }
    : {};

  const [data, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        tokenBalance: true,
        reputationScore: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { meta: { page, limit, total }, data };
};

const updateUser = async (id: string, payload: TUserAction) => {
  if (!payload.role && !payload.status) {
    throw new AppError(httpStatus.BAD_REQUEST, "No administrative action supplied");
  }

  return prisma.user.update({
    where: { id },
    data: {
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.status ? { status: payload.status } : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      tokenBalance: true,
      reputationScore: true,
      createdAt: true,
    },
  });
};

const listBazaarPosts = async (options: TListOptions) => {
  const { page, limit, skip, sortOrder } =
    paginationHelper.calculatePagination(options);
  const sortBy = safeSortBy(String(options.sortBy || ""), postSortFields, "createdAt");
  const search = String(options.search || "").trim();
  const where: Prisma.SkillPostWhereInput = search
    ? {
        OR: [
          { title: { contains: search, mode: "insensitive" } },
          { category: { contains: search, mode: "insensitive" } },
          { shortDescription: { contains: search, mode: "insensitive" } },
          { creator: { name: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.skillPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      select: {
        id: true,
        title: true,
        category: true,
        tokenPrice: true,
        moderationStatus: true,
        createdAt: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    }),
    prisma.skillPost.count({ where }),
  ]);

  return { meta: { page, limit, total }, data };
};

const moderatePost = async (id: string, action: "CLEAR" | "TAKE_DOWN") => {
  const moderationStatus = action === "CLEAR" ? "CLEAR" : "TAKEN_DOWN";

  return prisma.skillPost.update({
    where: { id },
    data: { moderationStatus },
    select: {
      id: true,
      title: true,
      category: true,
      tokenPrice: true,
      moderationStatus: true,
      createdAt: true,
      creator: { select: { id: true, name: true, email: true } },
    },
  });
};

const listDisputes = async (options: TListOptions) => {
  const { page, limit, skip, sortOrder } =
    paginationHelper.calculatePagination(options);
  const sortBy = safeSortBy(String(options.sortBy || ""), disputeSortFields, "updatedAt");
  const search = String(options.search || "").trim();
  const where: Prisma.BarterRequestWhereInput = search
    ? {
        OR: [
          { status: { contains: search, mode: "insensitive" } },
          { sender: { name: { contains: search, mode: "insensitive" } } },
          { receiver: { name: { contains: search, mode: "insensitive" } } },
          { skillOffered: { title: { contains: search, mode: "insensitive" } } },
          { skillRequested: { title: { contains: search, mode: "insensitive" } } },
        ],
      }
    : {};

  const [data, total] = await Promise.all([
    prisma.barterRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: sortOrder },
      include: {
        sender: { select: { id: true, name: true, email: true, tokenBalance: true } },
        receiver: { select: { id: true, name: true, email: true, tokenBalance: true } },
        skillOffered: { select: { id: true, title: true, tokenPrice: true } },
        skillRequested: { select: { id: true, title: true, tokenPrice: true } },
      },
    }),
    prisma.barterRequest.count({ where }),
  ]);

  return { meta: { page, limit, total }, data };
};

const resolveDispute = async (id: string, action: "REFUND" | "RELEASE") => {
  return prisma.$transaction(async (tx) => {
    const dispute = await tx.barterRequest.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
        skillOffered: { select: { id: true, title: true } },
        skillRequested: { select: { id: true, title: true } },
      },
    });

    if (!dispute) {
      throw new AppError(httpStatus.NOT_FOUND, "Dispute not found");
    }

    if (action === "RELEASE") {
      await tx.trade.create({
        data: {
          postId: dispute.skillRequestedId,
          learnerId: dispute.senderId,
          teacherId: dispute.receiverId,
          status: "COMPLETED",
        },
      });
    }

    return tx.barterRequest.update({
      where: { id },
      data: { status: action === "REFUND" ? "REFUNDED" : "RELEASED" },
      include: {
        sender: { select: { id: true, name: true, email: true, tokenBalance: true } },
        receiver: { select: { id: true, name: true, email: true, tokenBalance: true } },
        skillOffered: { select: { id: true, title: true, tokenPrice: true } },
        skillRequested: { select: { id: true, title: true, tokenPrice: true } },
      },
    });
  });
};

const getAiInfra = async () => {
  const [reviewedPosts, pendingPosts, aiSentiment, tokenVolume] =
    await Promise.all([
      prisma.skillPost.count({ where: { aiReviewGeneratedAt: { not: null } } }),
      prisma.skillPost.count({ where: { aiReviewGeneratedAt: null } }),
      prisma.skillPost.aggregate({ _avg: { aiReviewSentimentScore: true } }),
      prisma.transaction.aggregate({ _sum: { amount: true }, _count: { id: true } }),
    ]);

  return {
    reviewedPosts,
    pendingPosts,
    averageAiSentiment: Math.round(aiSentiment._avg.aiReviewSentimentScore || 0),
    tokenEvents: tokenVolume._count.id,
    trackedTokenVolume: tokenVolume._sum.amount || 0,
  };
};

export const AdminServices = {
  getOverview,
  listUsers,
  updateUser,
  listBazaarPosts,
  moderatePost,
  listDisputes,
  resolveDispute,
  getAiInfra,
};
