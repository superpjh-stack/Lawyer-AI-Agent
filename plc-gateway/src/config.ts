/**
 * =====================================================================
 *  환경설정 로더
 * =====================================================================
 *
 *  .env 파일과 프로세스 환경변수를 읽어 zod 스키마로 검증한 뒤
 *  타입 안전한 설정 객체(AppConfig)를 만듭니다.
 *
 *  - 잘못된 값(예: POLL_INTERVAL_MS=abc)이 있으면 기동 시점에 즉시 실패시켜
 *    운영 중 예기치 못한 동작을 방지합니다.
 *  - 모든 항목에 기본값이 있어 환경변수 없이도 시뮬레이터 모드로 바로 실행됩니다.
 *
 *  설정 항목 전체 목록과 설명은 plc-gateway/.env.example 을 참고하세요.
 * =====================================================================
 */

import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import type { TagDefinition } from './types';

// plc-gateway/.env 를 로드 (없어도 무방)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * boolean 환경변수 파서.
 * "1"/"true"/"yes"/"on" → true, 그 외 → false, 미설정 → 기본값
 */
const boolEnv = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined || v === '') return def;
      return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
    });

/**
 * 숫자 환경변수 파서.
 * 미설정/빈 문자열 → 기본값, 숫자가 아닌 값 → 검증 오류
 */
const numEnv = (def: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number({ invalid_type_error: '숫자여야 합니다' }).finite());

/**
 * 선택적 숫자 파서 (알람 임계값용).
 * 미설정 → 기본값, 빈 문자열("") → null (임계값 비활성화), 그 외 → 숫자
 */
const optionalNumEnv = (def: number | null) =>
  z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined) return def;
      if (v === '') return null;
      return Number(v);
    })
    .pipe(z.number({ invalid_type_error: '숫자여야 합니다' }).finite().nullable());

/**
 * 환경변수 스키마.
 * 각 항목의 의미는 .env.example 에 상세히 기술되어 있습니다.
 */
const EnvSchema = z.object({
  // ---- 일반 ----
  NODE_ENV: z.string().default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),

  // ---- PLC 연결 ----
  PLC_DRIVER: z.enum(['simulator', 'modbus-tcp']).default('simulator'),
  PLC_HOST: z.string().default('127.0.0.1'),
  PLC_PORT: numEnv(502),
  PLC_UNIT_ID: numEnv(1),
  /** holding(FC03) 또는 input(FC04) 레지스터 선택 */
  PLC_REGISTER_TYPE: z.enum(['holding', 'input']).default('holding'),
  PLC_REGISTER_SIGNED: boolEnv(true),

  // ---- 태그(온도) ----
  PLC_TEMP_REGISTER: numEnv(0),
  PLC_TEMP_SCALE: numEnv(0.1),
  PLC_TEMP_OFFSET: numEnv(0),

  // ---- 태그(압력) ----
  PLC_PRESSURE_REGISTER: numEnv(1),
  PLC_PRESSURE_SCALE: numEnv(0.01),
  PLC_PRESSURE_OFFSET: numEnv(0),

  // ---- 폴링 ----
  POLL_INTERVAL_MS: numEnv(1000),
  POLL_TIMEOUT_MS: numEnv(800),
  RECONNECT_BASE_MS: numEnv(1000),
  RECONNECT_MAX_MS: numEnv(30000),

  // ---- 저장소 ----
  HISTORY_CAPACITY: numEnv(3600),
  ALARM_HISTORY_CAPACITY: numEnv(500),

  // ---- 알람 임계값 ----
  ALARM_TEMP_HIGH: optionalNumEnv(80),
  ALARM_TEMP_LOW: optionalNumEnv(-10),
  ALARM_TEMP_HYSTERESIS: numEnv(2),
  ALARM_PRESSURE_HIGH: optionalNumEnv(8),
  ALARM_PRESSURE_LOW: optionalNumEnv(0.5),
  ALARM_PRESSURE_HYSTERESIS: numEnv(0.2),

  // ---- HTTP / WebSocket 서버 ----
  HTTP_HOST: z.string().default('0.0.0.0'),
  HTTP_PORT: numEnv(4000),
  GATEWAY_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),

  // ---- 싱크: JSONL 파일 ----
  SINK_JSONL_ENABLED: boolEnv(false),
  SINK_JSONL_DIR: z.string().default('./data'),
  SINK_JSONL_FLUSH_MS: numEnv(2000),

  // ---- 싱크: 상위 서버 HTTP 전달 ----
  SINK_HTTP_URL: z.string().optional(),
  SINK_HTTP_TOKEN: z.string().optional(),
  SINK_HTTP_BATCH_SIZE: numEnv(10),
  SINK_HTTP_FLUSH_MS: numEnv(5000),
  SINK_HTTP_MAX_BUFFER: numEnv(1000),

  // ---- 시뮬레이터 ----
  SIM_FAULT_RATE: numEnv(0),
  SIM_TEMP_BASE: numEnv(25),
  SIM_PRESSURE_BASE: numEnv(3),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * 애플리케이션 설정 객체.
 * 환경변수를 도메인 관점으로 재구성한 형태이며, 각 모듈은 이 객체만 의존합니다.
 */
export interface AppConfig {
  env: Env;
  /** 수집 대상 태그 정의 목록 */
  tags: TagDefinition[];
}

/**
 * 환경변수를 읽어 검증하고 AppConfig 를 생성합니다.
 * 검증 실패 시 상세 메시지와 함께 예외를 던집니다 (기동 실패 유도).
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`환경변수 검증 실패:\n${issues}`);
  }
  const env = parsed.data;

  // 폴링 타임아웃은 폴링 주기보다 짧아야 다음 주기와 겹치지 않음
  if (env.POLL_TIMEOUT_MS >= env.POLL_INTERVAL_MS) {
    throw new Error(
      `POLL_TIMEOUT_MS(${env.POLL_TIMEOUT_MS}) 는 POLL_INTERVAL_MS(${env.POLL_INTERVAL_MS}) 보다 작아야 합니다.`,
    );
  }

  /** 태그 정의: 온도 */
  const temperature: TagDefinition = {
    name: 'temperature',
    label: '온도',
    unit: '℃',
    register: env.PLC_TEMP_REGISTER,
    scale: env.PLC_TEMP_SCALE,
    offset: env.PLC_TEMP_OFFSET,
    signed: env.PLC_REGISTER_SIGNED,
    decimals: 1,
    alarm: {
      high: env.ALARM_TEMP_HIGH ?? undefined,
      low: env.ALARM_TEMP_LOW ?? undefined,
      hysteresis: env.ALARM_TEMP_HYSTERESIS,
    },
  };

  /** 태그 정의: 압력 */
  const pressure: TagDefinition = {
    name: 'pressure',
    label: '압력',
    unit: 'bar',
    register: env.PLC_PRESSURE_REGISTER,
    scale: env.PLC_PRESSURE_SCALE,
    offset: env.PLC_PRESSURE_OFFSET,
    signed: env.PLC_REGISTER_SIGNED,
    decimals: 2,
    alarm: {
      high: env.ALARM_PRESSURE_HIGH ?? undefined,
      low: env.ALARM_PRESSURE_LOW ?? undefined,
      hysteresis: env.ALARM_PRESSURE_HYSTERESIS,
    },
  };

  return { env, tags: [temperature, pressure] };
}
