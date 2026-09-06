/**
 * =====================================================================
 *  경량 구조화 로거
 * =====================================================================
 *
 *  외부 로깅 라이브러리 없이 JSON 한 줄(one-line JSON) 형식으로 출력합니다.
 *  Cloud Run / Docker / systemd-journald 등 어떤 환경에서도 stdout 수집기가
 *  그대로 파싱할 수 있도록 설계했습니다.
 *
 *  사용 예)
 *    const log = createLogger('poller');
 *    log.info('tick', { seq: 12, latencyMs: 3 });
 *    → {"ts":"2026-09-06T02:00:00.000Z","level":"info","module":"poller","msg":"tick","seq":12,"latencyMs":3}
 *
 *  로그 레벨은 환경변수 LOG_LEVEL (debug|info|warn|error) 로 제어합니다.
 * =====================================================================
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/** 레벨 우선순위 (숫자가 클수록 심각) */
const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

/** 현재 활성 레벨. setLogLevel() 로 런타임 변경 가능. */
let currentLevel: LogLevel = normalizeLevel(process.env.LOG_LEVEL);

/** 문자열을 안전하게 LogLevel 로 변환 (잘못된 값은 info) */
function normalizeLevel(raw?: string): LogLevel {
  const v = (raw ?? 'info').toLowerCase();
  return (v in LEVEL_ORDER ? v : 'info') as LogLevel;
}

/** 전역 로그 레벨 변경 */
export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

/** Error 객체를 JSON 직렬화 가능한 형태로 변환 */
function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

export interface Logger {
  debug(msg: string, meta?: Record<string, unknown>): void;
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

/**
 * 모듈별 로거 생성.
 * @param module 로그에 표기할 모듈명 (예: 'poller', 'http', 'modbus')
 */
export function createLogger(module: string): Logger {
  const emit = (level: LogLevel, msg: string, meta?: Record<string, unknown>) => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[currentLevel]) return;

    // meta 안에 Error 객체가 있으면 직렬화 가능한 형태로 변환
    const safeMeta: Record<string, unknown> = {};
    if (meta) {
      for (const [k, v] of Object.entries(meta)) {
        safeMeta[k] = v instanceof Error ? serializeError(v) : v;
      }
    }

    const line = JSON.stringify({
      ts: new Date().toISOString(),
      level,
      module,
      msg,
      ...safeMeta,
    });

    // error/warn 은 stderr, 나머지는 stdout 으로 분리 출력
    if (level === 'error' || level === 'warn') {
      process.stderr.write(line + '\n');
    } else {
      process.stdout.write(line + '\n');
    }
  };

  return {
    debug: (m, meta) => emit('debug', m, meta),
    info: (m, meta) => emit('info', m, meta),
    warn: (m, meta) => emit('warn', m, meta),
    error: (m, meta) => emit('error', m, meta),
  };
}
