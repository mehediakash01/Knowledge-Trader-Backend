import bcrypt from "bcrypt";
import httpStatus from "http-status";
import config from "../../../config";
import AppError from "../../../errors/AppError";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { prisma } from "../../../../lib/prisma";

type TLoginPayload = {
  email: string;
  password: string;
};

const loginUser = async (payload: TLoginPayload) => {
  const user = await prisma.user.findUnique({
    where: {
      email: payload.email,
    },
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User does not exist");
  }

  const isPasswordMatched = await bcrypt.compare(
    payload.password,
    user.password,
  );

  if (!isPasswordMatched) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Password is incorrect");
  }

  const jwtAccessSecret = config.jwt.accessSecret;
  const jwtRefreshSecret = config.jwt.refreshSecret;

  if (!jwtAccessSecret || !jwtRefreshSecret) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "JWT secrets are not configured",
    );
  }

  const jwtPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwtHelpers.createToken(
    jwtPayload,
    jwtAccessSecret,
    config.jwt.accessExpiresIn,
  );

  const refreshToken = jwtHelpers.createToken(
    jwtPayload,
    jwtRefreshSecret,
    config.jwt.refreshExpiresIn,
  );

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

const getMe = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      tokenBalance: true,
      reputationScore: true,
      image: true,
    },
  });
  return result;
};

export const AuthServices = {
  loginUser,
  getMe,
};
