import { createClient, RedisClientType } from "redis";
import config from "../config";
import logger from "./logger";

let redisClient: RedisClientType | null = null;
let connectPromise: Promise<void> | null = null;
const memoryCache = new Map<string, { value: string; expiresAt: number }>();

const getRedisClient = async () => {
  if (!config.redis.url) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({ 
      url: config.redis.url,
      socket: {
        reconnectStrategy: false
      }
    });
    
    redisClient.on("error", () => {
      // Intentionally ignoring so it doesn't spam logs. It will fall back to memory cache.
    });

    connectPromise = redisClient.connect().catch(() => {
      // Intentionally ignoring initial connect error to prevent log spam
    });
  }

  if (connectPromise && !redisClient.isReady) {
    await connectPromise;
  }

  return redisClient.isReady ? redisClient : null;
};

const get = async <T>(key: string): Promise<T | null> => {
  const client = await getRedisClient();

  if (client) {
    try {
      const cached = await client.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch (error) {
      logger.error({ message: "Redis get failed, falling back to memory", error: error instanceof Error ? error.message : String(error) });
    }
  }

  const cached = memoryCache.get(key);

  if (!cached || cached.expiresAt < Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return JSON.parse(cached.value) as T;
};

const set = async (key: string, value: unknown, ttlSeconds: number) => {
  const serialized = JSON.stringify(value);
  const client = await getRedisClient();

  if (client) {
    try {
      await client.set(key, serialized, { EX: ttlSeconds });
      return;
    } catch (error) {
      logger.error({ message: "Redis set failed, falling back to memory", error: error instanceof Error ? error.message : String(error) });
    }
  }

  memoryCache.set(key, {
    value: serialized,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const delByPrefix = async (prefix: string) => {
  const client = await getRedisClient();

  if (client) {
    try {
      const keys = await client.keys(`${prefix}*`);

      if (keys.length) {
        await client.del(keys);
      }
      return;
    } catch (error) {
      logger.error({ message: "Redis delByPrefix failed, falling back to memory", error: error instanceof Error ? error.message : String(error) });
    }
  }

  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
};

export const cache = {
  get,
  set,
  delByPrefix,
};
