import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt, maskSensitive, maskEmail } from '@/lib/security/encryption';

// 개발 환경 테스트 — ENCRYPTION_SECRET 없이 동작 (경고 출력)
process.env.NODE_ENV = 'test';
process.env.ENCRYPTION_SECRET = 'test-secret-key-for-vitest-only';

describe('encrypt / decrypt', () => {
  it('암호화 후 복호화 시 원문 일치', () => {
    const plaintext = '민감한 법률 데이터 — 홍길동 사건';
    const ciphertext = encrypt(plaintext);
    const decrypted = decrypt(ciphertext);
    expect(decrypted).toBe(plaintext);
  });

  it('암호문은 원문과 다름', () => {
    const plaintext = '비밀정보';
    const ciphertext = encrypt(plaintext);
    expect(ciphertext).not.toBe(plaintext);
  });

  it('같은 평문을 두 번 암호화하면 다른 암호문 생성 (랜덤 IV)', () => {
    const plaintext = '동일한 텍스트';
    const c1 = encrypt(plaintext);
    const c2 = encrypt(plaintext);
    expect(c1).not.toBe(c2);
  });

  it('빈 문자열 암호화/복호화', () => {
    const plaintext = '';
    const ciphertext = encrypt(plaintext);
    expect(decrypt(ciphertext)).toBe('');
  });

  it('한글 + 특수문자 포함 암호화/복호화', () => {
    const plaintext = '판례번호: 2026가단12345 (원고: 홍길동) — 비밀!@#$%';
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('긴 텍스트 (1000자) 암호화/복호화', () => {
    const plaintext = '가'.repeat(1000);
    expect(decrypt(encrypt(plaintext))).toBe(plaintext);
  });

  it('잘못된 암호문 복호화 시 오류 발생', () => {
    expect(() => decrypt('invalid-ciphertext')).toThrow();
  });

  it('암호문이 base64 형식', () => {
    const ciphertext = encrypt('테스트');
    // base64 패턴: A-Z, a-z, 0-9, +, /, = 만 포함
    expect(ciphertext).toMatch(/^[A-Za-z0-9+/]+=*$/);
  });
});

describe('maskSensitive', () => {
  it('전화번호 마스킹', () => {
    const masked = maskSensitive('010-1234-5678', 3, 4);
    expect(masked).toMatch(/^010/);
    expect(masked).toMatch(/5678$/);
    expect(masked).toContain('*');
  });

  it('짧은 문자열 전체 마스킹', () => {
    const masked = maskSensitive('abc', 3, 4);
    expect(masked).toBe('***');
  });

  it('기본 파라미터 동작', () => {
    // visibleStart=3, visibleEnd=4, masked=max(10-3-4,4)=4 → 길이=3+4+4=11
    const masked = maskSensitive('1234567890');
    expect(masked).toContain('*');
    expect(masked.startsWith('123')).toBe(true);
    expect(masked.endsWith('7890')).toBe(true);
  });
});

describe('maskEmail', () => {
  it('이메일 로컬 파트 마스킹', () => {
    const masked = maskEmail('lawyer@lexagent.kr');
    expect(masked).toContain('@lexagent.kr');
    expect(masked).toContain('*');
  });

  it('도메인은 보존', () => {
    const masked = maskEmail('hello@example.com');
    expect(masked.endsWith('@example.com')).toBe(true);
  });

  it('@가 없는 잘못된 이메일도 처리', () => {
    const masked = maskEmail('notemail');
    expect(typeof masked).toBe('string');
    expect(masked.length).toBeGreaterThan(0);
  });
});
