// LexAgent - API 레이트 리밋 (Redis 없이 in-memory 구현)
// 프로덕션에서는 Upstash Redis로 교체 예정

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// 메모리 기반 레이트 리밋 (단일 인스턴스 기준)
const store = new Map<string, RateLimitRecord>();

// 만료된 항목 정리 (메모리 누수 방지)
setInterval(() => {
  const now = Date.now();
  store.forEach((record, key) => {
    if (record.resetAt < now) {
      store.delete(key);
    }
  });
}, 60_000); // 1분마다 정리

export interface RateLimitOptions {
  /** 시간 창 (밀리초) */
  windowMs?: number;
  /** 시간 창 내 최대 요청 수 */
  max?: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * 슬라이딩 윈도우 레이트 리밋
 * @param key 식별자 (IP 주소, 사용자 ID 등)
 */
export function rateLimit(
  key: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { windowMs = 60_000, max = 60 } = options;
  const now = Date.now();

  const record = store.get(key);

  if (!record || record.resetAt < now) {
    // 새 창 시작
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: max - 1, resetAt: now + windowMs };
  }

  if (record.count >= max) {
    return { success: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { success: true, remaining: max - record.count, resetAt: record.resetAt };
}

/**
 * AI 채팅 API 전용 레이트 리밋 (분당 10회)
 */
export function chatRateLimit(identifier: string): RateLimitResult {
  return rateLimit(`chat:${identifier}`, { windowMs: 60_000, max: 10 });
}

/**
 * 인증 API 레이트 리밋 (분당 5회 - 브루트포스 방지)
 */
export function authRateLimit(identifier: string): RateLimitResult {
  return rateLimit(`auth:${identifier}`, { windowMs: 60_000, max: 5 });
}

/**
 * 일반 API 레이트 리밋 (분당 100회)
 */
export function apiRateLimit(identifier: string): RateLimitResult {
  return rateLimit(`api:${identifier}`, { windowMs: 60_000, max: 100 });
}
