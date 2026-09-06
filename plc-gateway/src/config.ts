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
 *  태그(수집 항목) 정의
 *  - 기본값: src/tags/imjingang.ts 의 ㈜임진강김치 태그 세트
 *  - PLC_TAGS_FILE=./tags.json 으로 JSON 파일을 지정하면 그 파일의 태그 배열로 대체됩니다.
 *    (레지스터 주소·스케일·임계값을 현장 PLC 프로그램에 맞게 조정할 때 사용)
 *
 *  설정 항목 전체 목록과 설명은 plc-gateway/.env.example 을 참고하세요.
 * =====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';
import { IMJINGANG_TAGS } from './tags/imjingang';
import type { TagDefinition } from './types';

// plc-gateway/.env 를 로드 (없어도 무방)
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/** boolean 환경변수 파서. "1"/"true"/"yes"/"on" → true, 미설정 → 기본값 */
const boolEnv = (def: boolean) =>
  z.string().optional().transform((v) => {
    if (v === undefined || v === '') return def;
    return ['1', 'true', 'yes', 'on'].includes(v.toLowerCase());
  });

/** 숫자 환경변수 파서. 미설정/빈 문자열 → 기본값, 숫자가 아닌 값 → 검증 오류 */
const numEnv = (def: number) =>
  z.string().optional()
    .transform((v) => (v === undefined || v === '' ? def : Number(v)))
    .pipe(z.number({ invalid_type_error: '숫자여야 합니다' }).finite());

/** 환경변수 스키마 */
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
  /** 태그 정의 JSON 파일 경로 (미설정 시 임진강김치 기본 태그 세트) */
  PLC_TAGS_FILE: z.string().optional(),

  // ---- 폴링 ----
  POLL_INTERVAL_MS: numEnv(1000),
  POLL_TIMEOUT_MS: numEnv(800),
  RECONNECT_BASE_MS: numEnv(1000),
  RECONNECT_MAX_MS: numEnv(30000),

  // ---- 저장소 ----
  HISTORY_CAPACITY: numEnv(3600),
  ALARM_HISTORY_CAPACITY: numEnv(500),

  // ---- HTTP / WebSocket 서버 ----
  HTTP_HOST: z.string().default('0.0.0.0'),
  HTTP_PORT: numEnv(4000),
  GATEWAY_API_KEY: z.string().optional(),
  CORS_ORIGIN: z.string().default('*'),

  // ---- 싱크: JSONL 파일 ----
  SINK_JSONL_ENABLED: boolEnv(false),
  SINK_JSONL_DIR: z.string().default('./data'),
  SINK_JSONL_FLUSH_MS: numEnv(2000),

  // ---- 싱크: 상위 서버(MES) HTTP 전달 ----
  SINK_HTTP_URL: z.string().optional(),
  SINK_HTTP_TOKEN: z.string().optional(),
  SINK_HTTP_BATCH_SIZE: numEnv(10),
  SINK_HTTP_FLUSH_MS: numEnv(5000),
  SINK_HTTP_MAX_BUFFER: numEnv(1000),

  // ---- 시뮬레이터 ----
  /** 읽기 실패 확률 (0~1). 재접속 로직 테스트용 */
  SIM_FAULT_RATE: numEnv(0),
});

export type Env = z.infer<typeof EnvSchema>;

/** 태그 정의 JSON 검증 스키마 (PLC_TAGS_FILE 로 읽은 파일용) */
const TagSchema = z.object({
  name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, '태그 이름은 영문/숫자/밑줄만 사용'),
  label: z.string(),
  process: z.string(),
  group: z.string(),
  kind: z.enum(['analog', 'digital', 'counter']),
  unit: z.string(),
  register: z.number().int().min(0),
  scale: z.number().finite().default(1),
  offset: z.number().finite().default(0),
  signed: z.boolean().default(false),
  decimals: z.number().int().min(0).max(4).default(0),
  alarm: z.object({ high: z.number().optional(), low: z.number().optional(), hysteresis: z.number().min(0).default(0) }).optional(),
  sim: z.object({
    base: z.number(), amplitude: z.number().optional(), noise: z.number().optional(), periodSec: z.number().optional(),
    incrementEverySec: z.number().optional(), toggleProbability: z.number().optional(), holdSec: z.number().optional(),
    spikeDelta: z.number().optional(),
  }).optional(),
  description: z.string().optional(),
});

/** 애플리케이션 설정 객체 */
export interface AppConfig {
  env: Env;
  /** 수집 대상 태그 정의 목록 */
  tags: TagDefinition[];
}

/** 태그 목록 로드: JSON 파일 또는 기본 세트 */
function loadTags(file?: string): TagDefinition[] {
  if (!file) return IMJINGANG_TAGS;
  const abs = path.resolve(process.cwd(), file);
  const raw = JSON.parse(fs.readFileSync(abs, 'utf8'));
  const parsed = z.array(TagSchema).min(1).safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`태그 정의 파일 검증 실패 (${abs}):\n${issues}`);
  }
  return parsed.data as TagDefinition[];
}

/** 태그 목록 정합성 검사 (이름 중복, group 내 단위 불일치) */
export function validateTags(tags: TagDefinition[]): void {
  const names = new Set<string>();
  const groupUnit = new Map<string, string>();
  for (const t of tags) {
    if (names.has(t.name)) throw new Error(`태그 이름 중복: ${t.name}`);
    names.add(t.name);
    if (t.kind === 'analog') {
      const u = groupUnit.get(t.group);
      if (u !== undefined && u !== t.unit) throw new Error(`group "${t.group}" 안의 단위가 다릅니다: ${u} vs ${t.unit} (${t.name})`);
      groupUnit.set(t.group, t.unit);
    }
  }
}

/**
 * 환경변수를 읽어 검증하고 AppConfig 를 생성합니다.
 * 검증 실패 시 상세 메시지와 함께 예외를 던집니다 (기동 실패 유도).
 */
export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`환경변수 검증 실패:\n${issues}`);
  }
  const env = parsed.data;

  // 폴링 타임아웃은 폴링 주기보다 짧아야 다음 주기와 겹치지 않음
  if (env.POLL_TIMEOUT_MS >= env.POLL_INTERVAL_MS) {
    throw new Error(`POLL_TIMEOUT_MS(${env.POLL_TIMEOUT_MS}) 는 POLL_INTERVAL_MS(${env.POLL_INTERVAL_MS}) 보다 작아야 합니다.`);
  }

  const tags = loadTags(env.PLC_TAGS_FILE);
  validateTags(tags);
  return { env, tags };
}
