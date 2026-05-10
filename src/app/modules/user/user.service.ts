import bcrypt from "bcrypt";
import { prisma } from "../../../../lib/prisma";

type TCreateUserPayload = {
  name: string;
  email: string;
  password: string;
};

const createUser = async (payload: TCreateUserPayload) => {
  const hashedPassword = await bcrypt.hash(payload.password, 12);

  const result = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      password: hashedPassword,
      tokenBalance: 10,
      reputationScore: 0.0,
      expertise: [],
      interests: [],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tokenBalance: true,
      reputationScore: true,
      expertise: true,
      interests: true,
    },
  });

  return result;
};

const getUserProfile = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      reputationScore: true,
      expertise: true,
      interests: true,
      posts: {
        include: {
          creator: {
            select: { id: true, name: true, reputationScore: true },
          },
          _count: {
            select: { reviews: true },
          },
        },
      },
    },
  });

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return result;
};

export const UserServices = {
  createUser,
  getUserProfile,
};
