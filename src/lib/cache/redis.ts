// LexAgent — Redis Cache Utility
// Upstash Redis (serverless) + in-memory Map fallback for dev environments

interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

// ---------------------------------------------------------------------------
// In-memory fallback (used when Upstash env vars are not set)
// ---------------------------------------------------------------------------
class InMemoryCache implements CacheClient {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}

// ---------------------------------------------------------------------------
// Upstash Redis wrapper
// ---------------------------------------------------------------------------
class UpstashCache implements CacheClient {
  private client: import('@upstash/redis').Redis;

  constructor(client: import('@upstash/redis').Redis) {
    this.client = client;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const result = await this.client.get<T>(key);
      return result ?? null;
    } catch (err) {
      console.warn('[cache] Redis GET error, falling through:', err);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    try {
      await this.client.set(key, value, { ex: ttlSeconds });
    } catch (err) {
      console.warn('[cache] Redis SET error, skipping cache write:', err);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      console.warn('[cache] Redis DEL error:', err);
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton factory
// ---------------------------------------------------------------------------
function createCacheClient(): CacheClient {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      // Dynamic import to avoid bundling Upstash when env vars are absent
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Redis } = require('@upstash/redis') as typeof import('@upstash/redis');
      const client = new Redis({ url, token });
      console.info('[cache] Using Upstash Redis');
      return new UpstashCache(client);
    } catch (err) {
      console.warn('[cache] Failed to initialize Upstash Redis, falling back to in-memory:', err);
    }
  } else {
    console.info('[cache] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory cache (dev mode)');
  }

  return new InMemoryCache();
}

// Module-level singleton (survives hot-reload in dev via module cache)
const globalForCache = global as typeof global & { _lexagentCache?: CacheClient };
if (!globalForCache._lexagentCache) {
  globalForCache._lexagentCache = createCacheClient();
}
export const cache: CacheClient = globalForCache._lexagentCache;

// ---------------------------------------------------------------------------
// Key generation helper
// ---------------------------------------------------------------------------
/**
 * Generates a namespaced, URL-safe cache key.
 * Example: generateKey('case-law', '손해배상', 'keyword', '1', '20')
 *          → 'case-law:%EC%86%90%ED%95%B4%EB%B0%B0%EC%83%81:keyword:1:20'
 */
export function generateKey(prefix: string, ...parts: (string | number)[]): string {
  const sanitized = parts.map((p) =>
    encodeURIComponent(String(p).trim())
  );
  return [prefix, ...sanitized].join(':');
}
