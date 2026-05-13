import { User } from "../../../../generated/prisma";
import AppError from "../../../errors/AppError";
import httpStatus from "http-status";
import bcrypt from "bcrypt";
import { prisma } from "../../../../lib/prisma";
import pick from "../../../shared/pick";

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
      learningPath: [],
      socialLinks: [],
      experience: [],
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tokenBalance: true,
      reputationScore: true,
      interests: true,
      expertise: true,
      image: true,
      bio: true,
      tagline: true,
      socialLinks: true,
      experience: true,
      learningPath: true,
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
      interests: true,
      expertise: true,
      learningPath: true,
      socialLinks: true,
      experience: true,
      image: true,
      bio: true,
      tagline: true,
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

const updateProfile = async (id: string, payload: Partial<User>) => {
  const allowedKeys = [
    "name",
    "bio",
    "tagline",
    "image",
    "socialLinks",
    "experience",
    "expertise",
    "learningPath",
  ];

  const data = pick(payload as Record<string, unknown>, allowedKeys);

  const result = await prisma.user.update({
    where: { id },
    data: data as any,
    select: {
      id: true,
      name: true,
      email: true,
      reputationScore: true,
      interests: true,
      expertise: true,
      learningPath: true,
      socialLinks: true,
      experience: true,
      image: true,
      bio: true,
      tagline: true,
    },
  });
  return result;
};

export const UserServices = {
  createUser,
  getUserProfile,
  updateProfile,
};
