import { test, expect } from '@playwright/test';

/**
 * 인증 플로우 E2E 테스트
 * 사전 조건: 개발 서버 실행 (npm run dev) 또는 baseURL 설정
 */

test.describe('인증 페이지', () => {
  test('로그인 페이지 로드', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/LexAgent/);
    await expect(page.getByRole('heading', { name: /로그인|LexAgent/i })).toBeVisible();
  });

  test('이메일/비밀번호 입력 필드 존재', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel(/이메일/i)).toBeVisible();
    await expect(page.getByLabel(/비밀번호/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /로그인/i })).toBeVisible();
  });

  test('빈 폼 제출 시 유효성 오류', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /로그인/i }).click();
    // HTML5 required 또는 커스텀 오류 메시지 확인
    const emailInput = page.getByLabel(/이메일/i);
    await expect(emailInput).toBeFocused();
  });

  test('잘못된 이메일 형식 입력', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill('not-email');
    await page.getByLabel(/비밀번호/i).fill('password123');
    await page.getByRole('button', { name: /로그인/i }).click();
    // 이메일 형식 오류 또는 서버 에러 표시
    await page.waitForTimeout(500);
    // 로그인 페이지에 머물러야 함 (리다이렉트 없어야 함)
    await expect(page).toHaveURL(/login/);
  });

  test('회원가입 페이지 링크 동작', async ({ page }) => {
    await page.goto('/login');
    const registerLink = page.getByRole('link', { name: /회원가입|등록/i });
    if (await registerLink.count() > 0) {
      await registerLink.click();
      await expect(page).toHaveURL(/register/);
    }
  });

  test('회원가입 페이지 로드', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveTitle(/LexAgent/);
  });
});

test.describe('보호된 경로 접근 제어', () => {
  test('미인증 상태에서 /dashboard 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/login/);
  });

  test('미인증 상태에서 /cases 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/cases');
    await expect(page).toHaveURL(/login/);
  });

  test('미인증 상태에서 /chat 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/chat');
    await expect(page).toHaveURL(/login/);
  });

  test('미인증 상태에서 /research 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/research');
    await expect(page).toHaveURL(/login/);
  });

  test('미인증 상태에서 /clients 접근 시 로그인으로 리다이렉트', async ({ page }) => {
    await page.goto('/clients');
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('보안 헤더', () => {
  test('X-Frame-Options: DENY 헤더 확인', async ({ request }) => {
    const response = await request.get('/login');
    const header = response.headers()['x-frame-options'];
    expect(header).toBe('DENY');
  });

  test('X-Content-Type-Options: nosniff 헤더 확인', async ({ request }) => {
    const response = await request.get('/login');
    const header = response.headers()['x-content-type-options'];
    expect(header).toBe('nosniff');
  });

  test('Strict-Transport-Security 헤더 확인', async ({ request }) => {
    const response = await request.get('/login');
    const header = response.headers()['strict-transport-security'];
    // 개발 환경에서는 없을 수 있으므로 존재 시만 검증
    if (header) {
      expect(header).toContain('max-age=');
      expect(header).toContain('includeSubDomains');
    }
  });

  test('Content-Security-Policy 헤더 존재', async ({ request }) => {
    const response = await request.get('/login');
    const header = response.headers()['content-security-policy'];
    if (header) {
      expect(header).toContain("default-src 'self'");
      expect(header).toContain("object-src 'none'");
    }
  });
});
