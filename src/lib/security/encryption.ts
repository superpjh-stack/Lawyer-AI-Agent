// LexAgent - 민감 데이터 암호화 유틸리티
// Node.js crypto 모듈 기반 AES-256-GCM 암호화

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;    // AES GCM IV: 16 bytes
const TAG_LENGTH = 16;   // GCM auth tag: 16 bytes
const KEY_LENGTH = 32;   // AES-256: 32 bytes

/**
 * 환경변수에서 암호화 키 파생 (scrypt)
 * ENCRYPTION_SECRET이 없으면 경고 후 기본값 사용 (개발 전용)
 */
function getDerivedKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[encryption] ENCRYPTION_SECRET 환경변수가 설정되지 않았습니다.');
    }
    console.warn('[encryption] ENCRYPTION_SECRET 미설정 — 개발용 기본값 사용 (프로덕션 금지)');
  }
  const salt = process.env.ENCRYPTION_SALT ?? 'lexagent-default-salt-v1';
  return scryptSync(secret ?? 'dev-secret-key-change-in-prod', salt, KEY_LENGTH);
}

/**
 * 문자열 암호화 (AES-256-GCM)
 * @returns base64 인코딩된 암호문 (iv:authTag:ciphertext 형식)
 */
export function encrypt(plaintext: string): string {
  const key = getDerivedKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // iv + authTag + ciphertext를 base64로 결합
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * 암호문 복호화
 * @param ciphertext encrypt()가 반환한 base64 문자열
 */
export function decrypt(ciphertext: string): string {
  const key = getDerivedKey();
  const combined = Buffer.from(ciphertext, 'base64');

  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

/**
 * 민감 필드 마스킹 (로그 출력용)
 * 예: "010-1234-5678" → "010-****-5678"
 */
export function maskSensitive(value: string, visibleStart = 3, visibleEnd = 4): string {
  if (value.length <= visibleStart + visibleEnd) {
    return '*'.repeat(value.length);
  }
  const start = value.slice(0, visibleStart);
  const end = value.slice(-visibleEnd);
  const masked = '*'.repeat(Math.max(value.length - visibleStart - visibleEnd, 4));
  return `${start}${masked}${end}`;
}

/**
 * 이메일 마스킹
 * 예: "lawyer@lexagent.kr" → "la***@lexagent.kr"
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return maskSensitive(email);
  const maskedLocal = maskSensitive(local, 2, 0);
  return `${maskedLocal}@${domain}`;
}
