// LexAgent - 환경변수 타입 검증
// 서버 시작 시 필수 환경변수 누락 방지

const requiredServerEnvs = [
  'DATABASE_URL',
  'AUTH_SECRET',
] as const;

const requiredClientEnvs = [
  // NEXT_PUBLIC_ prefix 변수
] as const;

function validateEnv(): void {
  if (typeof window !== 'undefined') return; // 클라이언트에서는 실행 안함

  const missing: string[] = [];

  for (const key of requiredServerEnvs) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    throw new Error(
      `[env] Missing required environment variables: ${missing.join(', ')}`
    );
  } else if (missing.length > 0) {
    console.warn(
      `[env] Warning: Missing environment variables: ${missing.join(', ')}`
    );
  }
}

// 앱 시작 시 검증 실행
validateEnv();

export const serverEnv = {
  DATABASE_URL: process.env.DATABASE_URL ?? '',
  AUTH_SECRET: process.env.AUTH_SECRET ?? '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
} as const;

export const clientEnv = {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME ?? 'LexAgent',
} as const;
