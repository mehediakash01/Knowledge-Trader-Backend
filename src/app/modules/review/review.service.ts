import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import AppError from "../../../errors/AppError";
import { sendLiveNotification } from "../../../socket";

type TCreateReviewPayload = {
  postId: string;
  rating: number;
  comment: string;
};

const updateCreatorReputation = async (creatorId: string) => {
  const aggregate = await prisma.review.aggregate({
    where: {
      post: {
        creatorId,
      },
    },
    _avg: {
      rating: true,
    },
  });

  await prisma.user.update({
    where: {
      id: creatorId,
    },
    data: {
      reputationScore: aggregate._avg.rating || 0,
    },
  });
};

const createReview = async (userId: string, payload: TCreateReviewPayload) => {
  const result = await prisma.$transaction(async (tx) => {
    const skillPost = await tx.skillPost.findUnique({
      where: {
        id: payload.postId,
      },
      select: {
        id: true,
        title: true,
        creatorId: true,
      },
    });

    if (!skillPost) {
      throw new AppError(httpStatus.NOT_FOUND, "Skill post not found");
    }

    if (skillPost.creatorId === userId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You cannot review your own skill post",
      );
    }

    const completedTrade = await tx.trade.findFirst({
      where: {
        postId: payload.postId,
        learnerId: userId,
        status: "COMPLETED",
      },
      select: {
        id: true,
      },
    });

    if (!completedTrade) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Only learners with a completed trade can review this post",
      );
    }

    const review = await tx.review.create({
      data: {
        postId: payload.postId,
        userId,
        rating: payload.rating,
        comment: payload.comment,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        post: {
          select: {
            id: true,
            title: true,
            creatorId: true,
          },
        },
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: skillPost.creatorId,
        title: "New review received",
        message: `Your skill post "${skillPost.title}" received a ${payload.rating}-star review.`,
      },
    });

    return { review, notification };
  });

  await updateCreatorReputation(result.review.post.creatorId);
  await prisma.skillPost.update({
    where: { id: payload.postId },
    data: {
      aiReviewSentimentScore: null,
      aiReviewPros: null,
      aiReviewCons: null,
      aiReviewSummary: null,
      aiReviewGeneratedAt: null,
    },
  });
  sendLiveNotification(result.notification.userId, result.notification);

  const { user, ...review } = result.review;

  return {
    ...review,
    reviewer: user,
  };
};

export const ReviewServices = {
  createReview,
};
