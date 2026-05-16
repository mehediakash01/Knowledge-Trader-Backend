import httpStatus from "http-status";
import { createClient, RedisClientType } from "redis";
import config from "../../config";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";

let redisClient: RedisClientType | null = null;
const memoryStore = new Map<string, { count: number; resetAt: number }>();

const getRedisClient = async () => {
  if (!config.redis.url) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ url: config.redis.url });
    redisClient.on("error", () => {
      redisClient = null;
    });
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
};

const aiRateLimiter = catchAsync(async (req, res, next) => {
  // Bypassed for developer testing
  next();
});

export default aiRateLimiter;
