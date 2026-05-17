import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import httpStatus from "http-status";
import config from "../../../config";
import AppError from "../../../errors/AppError";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { prisma } from "../../../../lib/prisma";

type TLoginPayload = {
  email: string;
  password: string;
};

type TGoogleLoginPayload = {
  token: string;
};

const authUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  tokenBalance: true,
  reputationScore: true,
  image: true,
  bio: true,
  tagline: true,
  interests: true,
  expertise: true,
  learningPath: true,
  socialLinks: true,
  experience: true,
} as const;

const buildAuthResponse = async (user: {
  id: string;
  name: string;
  email: string;
  role: string;
  status?: string;
  tokenBalance: number;
  reputationScore: number;
  image: string | null;
  bio: string | null;
  tagline: string | null;
  interests: string[];
  expertise: unknown;
  learningPath: unknown;
  socialLinks: unknown;
  experience: unknown;
}) => {
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
      status: user.status,
      image: user.image,
      bio: user.bio,
      tagline: user.tagline,
      reputationScore: user.reputationScore,
      tokenBalance: user.tokenBalance,
      interests: user.interests,
      expertise: user.expertise,
      learningPath: user.learningPath,
      socialLinks: user.socialLinks,
      experience: user.experience,
    },
  };
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

  return buildAuthResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    tokenBalance: user.tokenBalance,
    reputationScore: user.reputationScore,
    image: user.image,
    bio: user.bio,
    tagline: user.tagline,
    interests: user.interests,
    expertise: user.expertise,
    learningPath: user.learningPath,
    socialLinks: user.socialLinks,
    experience: user.experience,
  });
};

const googleLogin = async (payload: TGoogleLoginPayload) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;

  if (!googleClientId) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Google client ID is not configured",
    );
  }

  const client = new OAuth2Client(googleClientId);
  const ticket = await client.verifyIdToken({
    idToken: payload.token,
    audience: googleClientId,
  });
  const googlePayload = ticket.getPayload();

  if (!googlePayload?.email) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid Google token");
  }

  if (googlePayload.email_verified === false) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Google email is not verified");
  }

  const email = googlePayload.email;
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  const user =
    existingUser ??
    (await prisma.user.create({
      data: {
        name:
          googlePayload.name ||
          googlePayload.given_name ||
          email.split("@")[0] ||
          "Google User",
        email,
        password: await bcrypt.hash(randomBytes(32).toString("hex"), 12),
        image: googlePayload.picture,
        tokenBalance: 10,
        reputationScore: 0,
        interests: [],
        expertise: [],
        learningPath: [],
        socialLinks: [],
        experience: [],
      },
    }));

  return buildAuthResponse({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    tokenBalance: user.tokenBalance,
    reputationScore: user.reputationScore,
    image: user.image,
    bio: user.bio,
    tagline: user.tagline,
    interests: user.interests,
    expertise: user.expertise,
    learningPath: user.learningPath,
    socialLinks: user.socialLinks,
    experience: user.experience,
  });
};

const getMe = async (id: string) => {
  const result = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      tokenBalance: true,
      reputationScore: true,
      image: true,
      bio: true,
      tagline: true,
      interests: true,
      expertise: true,
      learningPath: true,
      socialLinks: true,
      experience: true,
    },
  });
  return result;
};

export const AuthServices = {
  loginUser,
  googleLogin,
  getMe,
};
