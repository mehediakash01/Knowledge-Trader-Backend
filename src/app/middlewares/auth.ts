import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { jwtHelpers } from "../../helpers/jwtHelpers";
import catchAsync from "../../shared/catchAsync";
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../../lib/prisma";

const isJwtVerificationError = (error: unknown): boolean => {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  if (!("name" in error)) {
    return false;
  }

  return (
    error.name === "TokenExpiredError" ||
    error.name === "JsonWebTokenError" ||
    error.name === "NotBeforeError"
  );
};

const auth = (...requiredRoles: Role[]) => {
  return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, "You are not authorized");
    }

    const jwtSecret = config.jwt.accessSecret;

    if (!jwtSecret) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "JWT access secret is not configured",
      );
    }

    let decoded;

    try {
      decoded = jwtHelpers.verifyToken(token, jwtSecret);
    } catch (error) {
      if (isJwtVerificationError(error)) {
        throw new AppError(httpStatus.UNAUTHORIZED, "Your session has expired");
      }

      throw error;
    }

    if (
      typeof decoded.id !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.role !== "string"
    ) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Invalid token payload");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      throw new AppError(httpStatus.NOT_FOUND, "User not found");
    }

    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      throw new AppError(httpStatus.FORBIDDEN, "Forbidden");
    }

    req.user = user;
    next();
  });
};

export const authorizeRole = (...requiredRoles: Role[]) => auth(...requiredRoles);

export const optionalAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.startsWith("Bearer ")
      ? req.headers.authorization.split(" ")[1]
      : undefined;

    if (!token) {
      next();
      return;
    }

    const jwtSecret = config.jwt.accessSecret;

    if (!jwtSecret) {
      next();
      return;
    }

    let decoded;

    try {
      decoded = jwtHelpers.verifyToken(token, jwtSecret);
    } catch (error) {
      if (isJwtVerificationError(error)) {
        next();
        return;
      }

      throw error;
    }

    if (
      typeof decoded.id !== "string" ||
      typeof decoded.email !== "string" ||
      typeof decoded.role !== "string"
    ) {
      next();
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (user) {
      req.user = user;
    }

    next();
  },
);

export default auth;
