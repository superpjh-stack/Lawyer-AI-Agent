import { test, expect } from '@playwright/test';

/**
 * API 보안 E2E 테스트
 * - Rate limiting
 * - CORS 정책
 * - 인증 없는 API 접근 차단
 */

test.describe('API 인증 보호', () => {
  test('/api/cases - 미인증 접근 차단', async ({ request }) => {
    const response = await request.get('/api/cases');
    // 401 또는 403 반환
    expect([401, 403]).toContain(response.status());
  });

  test('/api/chat - 미인증 POST 차단', async ({ request }) => {
    const response = await request.post('/api/chat', {
      data: { message: '테스트' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('/api/clients - 미인증 접근 차단', async ({ request }) => {
    const response = await request.get('/api/clients');
    expect([401, 403]).toContain(response.status());
  });

  test('/api/documents - 미인증 접근 차단', async ({ request }) => {
    const response = await request.get('/api/documents');
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('API 입력 유효성 검증', () => {
  test('/api/auth/register - 빈 body 400 반환', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {},
    });
    expect(response.status()).toBe(400);
  });

  test('/api/auth/register - 잘못된 이메일 400 반환', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {
        name: '테스트',
        email: 'not-email',
        password: 'Password1',
        firmName: '테스트 법무법인',
      },
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body).toHaveProperty('error');
  });

  test('/api/auth/register - 취약한 비밀번호 400 반환', async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      data: {
        name: '테스트',
        email: 'test@example.com',
        password: '12345',  // 8자 미만
        firmName: '테스트 법무법인',
      },
    });
    expect(response.status()).toBe(400);
  });
});

test.describe('Rate Limiting', () => {
  test('/api/auth/register - 6회 이상 요청 시 429 반환', async ({ request }) => {
    // 같은 IP에서 max=5 초과
    const promises = Array.from({ length: 7 }, (_, i) =>
      request.post('/api/auth/register', {
        data: {
          name: `테스트${i}`,
          email: `ratelimit-test-${i}-${Date.now()}@example.com`,
          password: 'Password123',
          firmName: '테스트 법무법인',
        },
      })
    );
    const responses = await Promise.all(promises);
    const statuses = responses.map(r => r.status());
    // 5번 이후 429가 나타나야 함
    const has429 = statuses.some(s => s === 429);
    expect(has429).toBe(true);
  });
});

test.describe('CORS 정책', () => {
  test('외부 Origin API 요청 차단', async ({ request }) => {
    const response = await request.get('/api/cases', {
      headers: {
        Origin: 'https://malicious-site.com',
      },
    });
    // CORS 차단: 403 또는 401
    expect([401, 403]).toContain(response.status());
  });
});
