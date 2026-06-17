import httpStatus from "http-status";
import prisma from "../../../shared/prisma";
import AppError from "../../../errors/AppError";

const getBalance = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { tokenBalance: true },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return { tokenBalance: user.tokenBalance };
};

const getTransactions = async (userId: string) => {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      trade: {
        include: {
          post: { select: { title: true } },
        },
      },
    },
  });

  return transactions.map((tx) => ({
    id: tx.id,
    amount: tx.amount,
    type: tx.type,
    createdAt: tx.createdAt,
    description: tx.trade?.post?.title ? `Trade for ${tx.trade.post.title}` : (tx.type === 'CREDIT' ? 'Token Purchase' : 'Token Exchange'),
  }));
};

const purchaseTokens = async (userId: string, amount: number) => {
  if (amount <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Amount must be greater than zero");
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: { increment: amount } },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        amount,
        type: "CREDIT",
      },
    });

    return { user, transaction };
  });

  return result;
};

const exchangeTokens = async (userId: string, amount: number) => {
  if (amount <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Amount must be greater than zero");
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    
    if (!user || user.tokenBalance < amount) {
      throw new AppError(httpStatus.BAD_REQUEST, "Insufficient token balance");
    }

    const updatedUser = await tx.user.update({
      where: { id: userId },
      data: { tokenBalance: { decrement: amount } },
    });

    const transaction = await tx.transaction.create({
      data: {
        userId,
        amount,
        type: "DEBIT",
      },
    });

    return { user: updatedUser, transaction };
  });

  return result;
};

export const WalletServices = {
  getBalance,
  getTransactions,
  purchaseTokens,
  exchangeTokens,
};
