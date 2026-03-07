// LexAgent - OpenAI 클라이언트 설정

import OpenAI from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY 환경변수가 설정되지 않았습니다.');
}

// 싱글턴 패턴으로 클라이언트 관리
const openaiClient = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default openaiClient;

// 공통 설정 상수
export const AI_MODEL = 'gpt-4o' as const;
export const MAX_TOKENS = 8096;
export const STREAMING_MAX_TOKENS = 4096;
