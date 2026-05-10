import httpStatus from "http-status";
import { prisma } from "../../../../lib/prisma";
import AppError from "../../../errors/AppError";
import { sendLiveNotification } from "../../../socket";

const executeTokenTrade = async (learnerId: string, postId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const skillPost = await tx.skillPost.findUnique({
      where: {
        id: postId,
      },
      select: {
        id: true,
        title: true,
        tokenPrice: true,
        creatorId: true,
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!skillPost) {
      throw new AppError(httpStatus.NOT_FOUND, "Skill post not found");
    }

    if (skillPost.creatorId === learnerId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You cannot buy your own skill post",
      );
    }

    const existingCompletedTrade = await tx.trade.findFirst({
      where: {
        postId,
        learnerId,
        status: "COMPLETED",
      },
      select: {
        id: true,
      },
    });

    if (existingCompletedTrade) {
      throw new AppError(
        httpStatus.CONFLICT,
        "You have already purchased this skill post",
      );
    }

    const learner = await tx.user.findUnique({
      where: {
        id: learnerId,
      },
      select: {
        id: true,
        tokenBalance: true,
      },
    });

    if (!learner) {
      throw new AppError(httpStatus.NOT_FOUND, "Learner not found");
    }

    if (learner.tokenBalance < skillPost.tokenPrice) {
      throw new AppError(httpStatus.BAD_REQUEST, "Insufficient token balance");
    }

    await tx.user.update({
      where: {
        id: learnerId,
      },
      data: {
        tokenBalance: {
          decrement: skillPost.tokenPrice,
        },
      },
    });

    await tx.user.update({
      where: {
        id: skillPost.creatorId,
      },
      data: {
        tokenBalance: {
          increment: skillPost.tokenPrice,
        },
      },
    });

    const trade = await tx.trade.create({
      data: {
        postId,
        learnerId,
        teacherId: skillPost.creatorId,
        status: "COMPLETED",
      },
      include: {
        post: {
          select: {
            id: true,
            title: true,
            tokenPrice: true,
          },
        },
        learner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        teacher: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    const debitTransaction = await tx.transaction.create({
      data: {
        userId: learnerId,
        tradeId: trade.id,
        amount: skillPost.tokenPrice,
        type: "DEBIT",
      },
    });

    const creditTransaction = await tx.transaction.create({
      data: {
        userId: skillPost.creatorId,
        tradeId: trade.id,
        amount: skillPost.tokenPrice,
        type: "CREDIT",
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: skillPost.creatorId,
        title: "New token trade completed",
        message: `${trade.learner.name} purchased "${skillPost.title}" for ${skillPost.tokenPrice} tokens.`,
      },
    });

    return {
      trade,
      debitTransaction,
      creditTransaction,
      notification,
    };
  });

  sendLiveNotification(result.notification.userId, result.notification);

  return result;
};

const getMyTrades = async (userId: string) => {
  const [learningTrades, teachingTrades, sentBarters, receivedBarters] =
    await Promise.all([
      prisma.trade.findMany({
        where: {
          learnerId: userId,
        },
        orderBy: {
          id: "desc",
        },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              tokenPrice: true,
            },
          },
          teacher: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          transaction: true,
        },
      }),
      prisma.trade.findMany({
        where: {
          teacherId: userId,
        },
        orderBy: {
          id: "desc",
        },
        include: {
          post: {
            select: {
              id: true,
              title: true,
              slug: true,
              tokenPrice: true,
            },
          },
          learner: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          transaction: true,
        },
      }),
      prisma.BarterRequest.findMany({
        where: {
          senderId: userId,
        },
        include: {
          skillOffered: true,
          skillRequested: true,
          receiver: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.BarterRequest.findMany({
        where: {
          receiverId: userId,
        },
        include: {
          skillOffered: true,
          skillRequested: true,
          sender: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

  return {
    learningTrades,
    teachingTrades,
    sentBarters,
    receivedBarters,
  };
};

const createBarterRequest = async (payload: {
  senderId: string;
  receiverId: string;
  skillOfferedId: string;
  skillRequestedId: string;
}) => {
  const { senderId, receiverId, skillOfferedId, skillRequestedId } = payload;

  if (senderId === receiverId) {
    throw new AppError(httpStatus.BAD_REQUEST, "You cannot barter with yourself");
  }

  const result = await prisma.$transaction(async (tx) => {
    // Check if skill offered belongs to sender
    const skillOffered = await tx.skillPost.findUnique({
      where: { id: skillOfferedId },
    });
    if (!skillOffered || skillOffered.creatorId !== senderId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "You don't own the skill you're offering",
      );
    }

    // Check if skill requested belongs to receiver
    const skillRequested = await tx.skillPost.findUnique({
      where: { id: skillRequestedId },
    });
    if (!skillRequested || skillRequested.creatorId !== receiverId) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "The receiver doesn't own the skill you're requesting",
      );
    }

    const barterRequest = await tx.BarterRequest.create({
      data: {
        senderId,
        receiverId,
        skillOfferedId,
        skillRequestedId,
        status: "PENDING",
      },
      include: {
        sender: { select: { name: true } },
        skillOffered: { select: { title: true } },
        skillRequested: { select: { title: true } },
      },
    });

    const notification = await tx.notification.create({
      data: {
        userId: receiverId,
        title: "New Barter Request",
        message: `${barterRequest.sender.name} wants to swap "${barterRequest.skillOffered.title}" for your "${barterRequest.skillRequested.title}".`,
      },
    });

    return { barterRequest, notification };
  });

  sendLiveNotification(result.notification.userId, result.notification);
  return result.barterRequest;
};

const updateBarterStatus = async (
  barterId: string,
  userId: string,
  status: "ACCEPTED" | "REJECTED",
) => {
  const result = await prisma.$transaction(async (tx) => {
    const barterRequest = await tx.BarterRequest.findUnique({
      where: { id: barterId },
      include: {
        sender: { select: { id: true, name: true } },
        receiver: { select: { id: true, name: true } },
        skillOffered: { select: { id: true, title: true } },
        skillRequested: { select: { id: true, title: true } },
      },
    });

    if (!barterRequest) {
      throw new AppError(httpStatus.NOT_FOUND, "Barter request not found");
    }

    if (barterRequest.receiverId !== userId) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "You are not authorized to update this request",
      );
    }

    if (barterRequest.status !== "PENDING") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Barter request is already ${barterRequest.status}`,
      );
    }

    const updatedBarter = await tx.BarterRequest.update({
      where: { id: barterId },
      data: { status },
    });

    let notification;

    if (status === "ACCEPTED") {
      // ATOMIC SWAP: Grant access to both parties
      // 1. Grant sender access to skillRequested
      await tx.trade.create({
        data: {
          postId: barterRequest.skillRequestedId,
          learnerId: barterRequest.senderId,
          teacherId: barterRequest.receiverId,
          status: "COMPLETED",
        },
      });

      // 2. Grant receiver access to skillOffered
      await tx.trade.create({
        data: {
          postId: barterRequest.skillOfferedId,
          learnerId: barterRequest.receiverId,
          teacherId: barterRequest.senderId,
          status: "COMPLETED",
        },
      });

      notification = await tx.notification.create({
        data: {
          userId: barterRequest.senderId,
          title: "Barter Accepted!",
          message: `${barterRequest.receiver.name} accepted your swap! You now have access to "${barterRequest.skillRequested.title}".`,
        },
      });
    } else {
      notification = await tx.notification.create({
        data: {
          userId: barterRequest.senderId,
          title: "Barter Rejected",
          message: `${barterRequest.receiver.name} declined your swap request for "${barterRequest.skillRequested.title}".`,
        },
      });
    }

    return { updatedBarter, notification };
  });

  sendLiveNotification(result.notification.userId, result.notification);
  return result.updatedBarter;
};

export const TradeServices = {
  executeTokenTrade,
  getMyTrades,
  createBarterRequest,
  updateBarterStatus,
};
