// ── Sliding Window Rate Limiter ────────────────────────────────────────
//
// Supports two backends:
// 1. In-memory (development) - uses a sorted map of timestamps per key
// 2. Redis (production) - uses sorted sets with TTL for distributed rate limiting
//
// Usage:
//   const limiter = createRateLimiter({ windowMs: 60000, max: 100 });
//   app.use('/api/auth', limiter);

import { env } from '../config.js';

// In-memory store for development (not suitable for multi-instance production)
class MemoryStore {
  constructor() {
    this.windows = new Map(); // key -> sorted array of timestamps
  }

  async increment(key, windowMs) {
    const now = Date.now();
    const windowStart = now - windowMs;

    let timestamps = this.windows.get(key);
    if (!timestamps) {
      timestamps = [];
      this.windows.set(key, timestamps);
    }

    // Remove expired timestamps
    while (timestamps.length > 0 && timestamps[0] < windowStart) {
      timestamps.shift();
    }

    // Add current request
    timestamps.push(now);

    // Clean up empty windows periodically
    if (timestamps.length === 0) {
      this.windows.delete(key);
    }

    return {
      totalHits: timestamps.length,
      resetTime: timestamps.length > 0 ? timestamps[0] + windowMs : now + windowMs,
    };
  }

  async reset(key) {
    this.windows.delete(key);
  }
}

// Redis store for production (requires ioredis)
let RedisStore = null;
try {
  // Dynamic import to avoid requiring ioredis in development
  // eslint-disable-next-line global-require
  const Redis = await import('ioredis');
  RedisStore = class RedisStore {
    constructor(redisUrl) {
      this.redis = new Redis.default(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy: (times) => Math.min(times * 100, 3000),
        lazyConnect: true,
      });
      this.connected = false;
    }

    async connect() {
      if (!this.connected) {
        await this.redis.connect();
        this.connected = true;
      }
    }

    async increment(key, windowMs) {
      await this.connect();
      const now = Date.now();
      const windowStart = now - windowMs;
      const redisKey = `ratelimit:${key}`;

      const pipeline = this.redis.pipeline();
      // Remove expired entries
      pipeline.zremrangebyscore(redisKey, 0, windowStart);
      // Add current request
      pipeline.zadd(redisKey, now, `${now}:${Math.random()}`);
      // Set TTL on the key (windowMs + buffer)
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000) + 1);
      // Count current hits
      pipeline.zcard(redisKey);

      const results = await pipeline.exec();
      const totalHits = results[3][1]; // zcard result

      return {
        totalHits,
        resetTime: now + windowMs,
      };
    }

    async reset(key) {
      await this.connect();
      await this.redis.del(`ratelimit:${key}`);
    }

    async close() {
      if (this.connected) {
        await this.redis.quit();
        this.connected = false;
      }
    }
  };
} catch {
  // ioredis not available, RedisStore remains null
}

/**
 * Creates a sliding window rate limiter middleware.
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {Function} [options.keyGenerator] - Function to generate rate limit key from request
 * @param {string} [options.message] - Error message when limit exceeded
 * @param {string} [options.code] - Error code when limit exceeded
 * @param {boolean} [options.standardHeaders] - Add RateLimit headers (draft-7)
 * @param {boolean} [options.legacyHeaders] - Add X-RateLimit headers
 * @returns {Function} Express middleware
 */
export function createRateLimiter({
  windowMs = 60000,
  max = 100,
  keyGenerator = (req) => req.ip,
  message = 'Too many requests — please try again later.',
  code = 'RATE_LIMITED',
  standardHeaders = true,
  legacyHeaders = false,
} = {}) {
  // Choose store based on environment
  let store;
  const redisUrl = process.env.REDIS_URL || process.env.REDIS_HOST;

  if (env.isProd && redisUrl && RedisStore) {
    store = new RedisStore(redisUrl);
    console.log('[RateLimiter] Using Redis store');
  } else {
    store = new MemoryStore();
    if (env.isProd) {
      console.warn('[RateLimiter] Redis not configured, using in-memory store (not suitable for multi-instance production)');
    } else {
      console.log('[RateLimiter] Using in-memory store');
    }
  }

  return async (req, res, next) => {
    const key = keyGenerator(req);
    if (!key) {
      return next(); // Skip if no key
    }

    try {
      const { totalHits, resetTime } = await store.increment(key, windowMs);

      const remaining = Math.max(0, max - totalHits);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

      // Set standard headers (draft-7)
      if (standardHeaders) {
        res.setHeader('RateLimit-Limit', max);
        res.setHeader('RateLimit-Remaining', remaining);
        res.setHeader('RateLimit-Reset', Math.ceil(resetTime / 1000));
      }

      // Set legacy headers
      if (legacyHeaders) {
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000));
      }

      if (totalHits > max) {
        res.setHeader('Retry-After', retryAfter);
        return res.status(429).json({
          success: false,
          message,
          code,
          retryAfter,
        });
      }

      next();
    } catch (err) {
      console.error('[RateLimiter] Error:', err);
      // Fail open - don't block requests if rate limiter fails
      next();
    }
  };
}

/**
 * Pre-configured limiters for common use cases.
 */
export const rateLimiters = {
  // Auth endpoints: strict limit
  auth: createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 requests per 15 min
    keyGenerator: (req) => `${req.ip}:${req.get('user-agent') || 'unknown'}`,
    message: 'Too many authentication attempts — please try again later.',
    code: 'AUTH_RATE_LIMITED',
  }),

  // API endpoints: moderate limit
  api: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 100, // 100 requests per minute
    message: 'Too many API requests — please slow down.',
    code: 'API_RATE_LIMITED',
  }),

  // AI endpoints: very strict
  ai: createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: 'Too many AI requests — please try again later.',
    code: 'AI_RATE_LIMITED',
  }),

  // Password reset: very strict
  passwordReset: createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 requests per hour
    message: 'Too many password reset attempts — please try again later.',
    code: 'RESET_RATE_LIMITED',
  }),
};

export { MemoryStore, RedisStore };