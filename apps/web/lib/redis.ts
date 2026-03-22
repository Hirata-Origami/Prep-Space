import { Redis } from '@upstash/redis'

/**
 * Shared Upstash Redis client.
 * Uses environment variables UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
 */
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
})

/**
 * Fetches data with Redis caching.
 * @param key The unique key to cache this data under.
 * @param fetcher Async function returning the data if cache misses.
 * @param ttlSeconds Seconds until the cache expires (default 3600 = 1 hr).
 */
export async function fetchWithRedis<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 3600
): Promise<T> {
  // 1. Try Cache
  try {
    const cached = await redis.get<T>(key)
    if (cached !== null) {
      return cached
    }
  } catch (err) {
    console.error(`[Redis] Cache read error for key: ${key}`, err)
  }

  // 2. Fetch fresh data
  const data = await fetcher()

  // 3. Populate Cache
  if (data !== null && data !== undefined) {
    try {
      await redis.setex(key, ttlSeconds, data)
    } catch (err) {
      console.error(`[Redis] Cache write error for key: ${key}`, err)
    }
  }

  return data
}
