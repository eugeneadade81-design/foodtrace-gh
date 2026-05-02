import Redis from "ioredis";

type CacheEntry = {
  value: string;
  expiresAt: number;
};

const memoryCache = new Map<string, CacheEntry>();
let redisClient: Redis | null = null;

function getRedisClient() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    redisClient.on("error", () => {
      // Redis is optional in local development; fall back to memory cache.
    });
  }

  return redisClient;
}

async function readMemoryCache(key: string) {
  const entry = memoryCache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  return entry.value;
}

async function writeMemoryCache(key: string, value: string, ttlSeconds: number) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

export async function getCachedJson<T>(key: string): Promise<T | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      const cached = await redis.get(key);
      if (cached) {
        return JSON.parse(cached) as T;
      }
    } catch {
      // Ignore Redis failures and fall back to memory.
    }
  }

  const memoryValue = await readMemoryCache(key);
  if (!memoryValue) {
    return null;
  }

  return JSON.parse(memoryValue) as T;
}

export async function setCachedJson(key: string, value: unknown, ttlSeconds: number) {
  const payload = JSON.stringify(value);
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(key, payload, "EX", ttlSeconds);
      return;
    } catch {
      // Ignore Redis failures and fall back to memory.
    }
  }

  await writeMemoryCache(key, payload, ttlSeconds);
}
