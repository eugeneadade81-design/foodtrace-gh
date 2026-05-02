import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  limit: number;
  message?: string;
  keyResolver?: (req: Request) => string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

export function createRateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = options.keyResolver?.(req) ?? (req.ip ?? "unknown");
    const now = Date.now();
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }

    if (bucket.count >= options.limit) {
      return res.status(429).json({
        error: options.message ?? "Too many requests",
      });
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    return next();
  };
}
