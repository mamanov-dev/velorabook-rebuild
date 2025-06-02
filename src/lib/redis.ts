import Redis from 'ioredis';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis as UpstashRedis } from '@upstash/redis';

// Локальный Redis
const localRedis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  lazyConnect: true,
  maxRetriesPerRequest: 3,
});

// Upstash Redis для продакшена
const upstashRedis = process.env.UPSTASH_REDIS_REST_URL
  ? new UpstashRedis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export const redis =
  process.env.NODE_ENV === 'production' && upstashRedis
    ? upstashRedis
    : localRedis;

export class CacheService {
  static async set(key: string, value: unknown, ttl = 3600): Promise<void> {
    try {
      if (redis instanceof Redis) {
        // Локальный Redis - нужна сериализация
        const data = JSON.stringify(value);
        await redis.setex(key, ttl, data);
      } else {
        // Upstash Redis - автоматическая сериализация
        await redis.set(key, value, { ex: ttl });
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  static async get(key: string): Promise<unknown | null> {
    try {
      const cached = await redis.get(key);

      if (!cached) return null;

      if (redis instanceof Redis) {
        // Локальный Redis - нужна десериализация
        return JSON.parse(cached as string);
      } else {
        // Upstash Redis - уже десериализован
        return cached;
      }
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }
}

// Rate Limiting
export const rateLimiter = upstashRedis
  ? new Ratelimit({
      redis: upstashRedis,
      limiter: Ratelimit.slidingWindow(3, '1 h'), // 3 запроса в час
    })
  : null;

// Простой fallback для локальной разработки
export class SimpleRateLimiter {
  private static requests = new Map<string, number[]>();

  static checkLimit(id: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!this.requests.has(id)) {
      this.requests.set(id, []);
    }

    const userRequests = this.requests.get(id)!;
    const validRequests = userRequests.filter((time) => time > windowStart);

    if (validRequests.length >= limit) {
      return false;
    }

    validRequests.push(now);
    this.requests.set(id, validRequests);
    return true;
  }
}

export async function checkRedisHealth(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
