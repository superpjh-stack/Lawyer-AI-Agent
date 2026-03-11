import { describe, it, expect, beforeEach, vi } from 'vitest';
import { rateLimit, chatRateLimit, authRateLimit, apiRateLimit } from '@/lib/security/rate-limit';

describe('rateLimit', () => {
  it('첫 요청은 성공', () => {
    const result = rateLimit('test-key-1', { windowMs: 60_000, max: 5 });
    expect(result.success).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('max 횟수 이내 요청은 모두 성공', () => {
    const key = 'test-key-2';
    for (let i = 0; i < 3; i++) {
      const result = rateLimit(key, { windowMs: 60_000, max: 3 });
      expect(result.success).toBe(true);
    }
  });

  it('max 초과 요청은 실패', () => {
    const key = 'test-key-3';
    // max=2: 2번 소진
    rateLimit(key, { windowMs: 60_000, max: 2 });
    rateLimit(key, { windowMs: 60_000, max: 2 });
    // 3번째는 실패
    const result = rateLimit(key, { windowMs: 60_000, max: 2 });
    expect(result.success).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('remaining 카운트가 감소', () => {
    const key = 'test-key-4';
    const r1 = rateLimit(key, { windowMs: 60_000, max: 5 });
    const r2 = rateLimit(key, { windowMs: 60_000, max: 5 });
    expect(r1.remaining).toBeGreaterThan(r2.remaining);
  });

  it('resetAt이 미래 시각', () => {
    const result = rateLimit('test-key-5', { windowMs: 60_000, max: 5 });
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });

  it('실패 시 resetAt 반환', () => {
    const key = 'test-key-6';
    rateLimit(key, { windowMs: 60_000, max: 1 });
    const failed = rateLimit(key, { windowMs: 60_000, max: 1 });
    expect(failed.success).toBe(false);
    expect(failed.resetAt).toBeGreaterThan(Date.now());
  });
});

describe('chatRateLimit', () => {
  it('키 충돌 없이 독립 동작', () => {
    const r1 = chatRateLimit('user-a');
    const r2 = chatRateLimit('user-b');
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });
});

describe('authRateLimit', () => {
  it('max 5 설정 확인 (6번째 실패)', () => {
    const ip = `test-auth-ip-${Date.now()}`; // 고유 IP로 충돌 방지
    for (let i = 0; i < 5; i++) {
      expect(authRateLimit(ip).success).toBe(true);
    }
    expect(authRateLimit(ip).success).toBe(false);
  });
});

describe('apiRateLimit', () => {
  it('첫 요청은 성공', () => {
    const result = apiRateLimit(`api-user-${Date.now()}`);
    expect(result.success).toBe(true);
  });
});
