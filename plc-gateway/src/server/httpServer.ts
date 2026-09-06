/**
 * =====================================================================
 *  HTTP(REST) 서버
 * =====================================================================
 *
 *  Express 5 기반 REST API 와 정적 대시보드를 제공합니다.
 *
 *  엔드포인트
 *   GET /health                  헬스체크 (PLC 연결/폴러 상태 포함) - 인증 불필요
 *   GET /metrics                 Prometheus 텍스트 포맷 메트릭      - 인증 불필요
 *   GET /api/v1/tags             태그 정의 목록 (단위/임계값)
 *   GET /api/v1/latest           최신 샘플 1건
 *   GET /api/v1/history          이력 조회 ?limit=300&since=<ISO|epochMs>&goodOnly=true
 *   GET /api/v1/stats            통계 ?window=60 (초)
 *   GET /api/v1/alarms           알람 ?active=true (활성만) / ?limit=100 (이력)
 *   GET /                        실시간 대시보드 (public/index.html)
 *
 *  인증
 *   GATEWAY_API_KEY 가 설정되면 /api/* 요청에 X-API-Key 헤더(또는 ?apiKey=)가 필요합니다.
 *   WebSocket 도 동일 키를 사용합니다.
 * =====================================================================
 */

import http from 'node:http';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { AppConfig } from '../config';
import type { AlarmEngine } from '../core/AlarmEngine';
import type { DataStore } from '../core/DataStore';
import type { Poller } from '../core/Poller';
import { publicTag } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('http');

export interface HttpServerDeps {
  config: AppConfig;
  poller: Poller;
  store: DataStore;
  alarms: AlarmEngine;
  /** 프로세스 기동 시각 (uptime 계산) */
  startedAt: number;
}

/** 쿼리 파라미터를 안전하게 정수로 변환 (범위 제한) */
function intParam(raw: unknown, def: number, min: number, max: number): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN;
  if (Number.isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

/** since 파라미터: ISO 문자열 또는 epoch ms 모두 허용 */
function sinceParam(raw: unknown): number | undefined {
  if (typeof raw !== 'string' || raw === '') return undefined;
  const asNum = Number(raw);
  if (!Number.isNaN(asNum)) return asNum;
  const asDate = Date.parse(raw);
  return Number.isNaN(asDate) ? undefined : asDate;
}

/**
 * API 키 검증 미들웨어 팩토리.
 * 키가 설정되지 않았으면 통과(개발 편의), 설정되었으면 헤더/쿼리로 검증.
 */
export function apiKeyGuard(apiKey?: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!apiKey) return next();
    const provided = req.header('x-api-key') ?? (req.query.apiKey as string | undefined);
    if (provided === apiKey) return next();
    res.status(401).json({ error: 'unauthorized', message: 'X-API-Key 헤더가 필요합니다' });
  };
}

/** Express 앱과 Node HTTP 서버를 생성 (WebSocket 은 같은 서버에 attach 됨) */
export function createHttpServer(deps: HttpServerDeps): { app: express.Express; server: http.Server } {
  const { config, poller, store, alarms, startedAt } = deps;
  const { env, tags } = config;

  const app = express();
  app.disable('x-powered-by');

  // ---- CORS (대시보드를 다른 오리진에서 띄우는 경우 대비) ----
  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', env.CORS_ORIGIN);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  // ---- 요청 로그 (debug 레벨) ----
  app.use((req, res, next) => {
    const t = Date.now();
    res.on('finish', () => log.debug('request', { method: req.method, url: req.url, status: res.statusCode, ms: Date.now() - t }));
    next();
  });

  // ------------------------------------------------------------------
  //  헬스체크 / 메트릭 (인증 없음 - 로드밸런서/모니터링용)
  // ------------------------------------------------------------------
  app.get('/health', (_req, res) => {
    const p = poller.getStats();
    const latest = store.getLatest();
    // PLC 가 끊겨 있어도 게이트웨이 프로세스는 살아있으므로 200 + status 로 구분
    const status = p.connected ? 'ok' : 'degraded';
    res.json({
      status,
      uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
      now: new Date().toISOString(),
      plc: {
        driver: p.driver,
        connected: p.connected,
        lastGoodAt: p.lastGoodAt,
        lastError: p.lastError,
        lastLatencyMs: p.lastLatencyMs,
        consecutiveFailures: p.consecutiveFailures,
        reconnectAttempts: p.reconnectAttempts,
      },
      poller: {
        running: p.running,
        intervalMs: env.POLL_INTERVAL_MS,
        totalSamples: p.totalSamples,
        goodSamples: p.goodSamples,
        badSamples: p.badSamples,
        skippedTicks: p.skippedTicks,
      },
      store: { size: store.length, capacity: store.maxCapacity },
      latestSeq: latest?.seq ?? null,
      activeAlarms: alarms.getActive().length,
    });
  });

  app.get('/metrics', (_req, res) => {
    const p = poller.getStats();
    const latest = store.getLatest();
    const lines: string[] = [];
    // Prometheus 규격: HELP/TYPE 는 메트릭 이름당 1회만 출력 (라벨이 달라도 반복 금지)
    const declared = new Set<string>();
    const g = (name: string, help: string, value: number | null, labels = '') => {
      if (value === null) return;
      if (!declared.has(name)) {
        declared.add(name);
        lines.push(`# HELP ${name} ${help}`, `# TYPE ${name} gauge`);
      }
      lines.push(`${name}${labels} ${value}`);
    };
    g('plc_gateway_connected', 'PLC 연결 여부 (1=연결)', p.connected ? 1 : 0);
    g('plc_gateway_samples_total', '총 샘플 수', p.totalSamples);
    g('plc_gateway_samples_bad_total', 'BAD 샘플 수', p.badSamples);
    g('plc_gateway_skipped_ticks_total', '건너뛴 틱 수', p.skippedTicks);
    g('plc_gateway_last_latency_ms', '최근 읽기 지연(ms)', p.lastLatencyMs);
    g('plc_gateway_active_alarms', '활성 알람 수', alarms.getActive().length);
    if (latest && latest.quality === 'GOOD') {
      for (const t of tags) {
        g('plc_tag_value', '태그 현재값', latest.values[t.name], `{tag="${t.name}",kind="${t.kind}",unit="${t.unit}"}`);
      }
    }
    res.type('text/plain; version=0.0.4').send(lines.join('\n') + '\n');
  });

  // ------------------------------------------------------------------
  //  데이터 API (API 키 보호)
  // ------------------------------------------------------------------
  const api = express.Router();
  api.use(apiKeyGuard(env.GATEWAY_API_KEY));

  api.get('/tags', (_req, res) => {
    res.json({ tags: tags.map((t) => publicTag(t, env.PLC_DRIVER === 'modbus-tcp')) });
  });

  api.get('/latest', (_req, res) => {
    const latest = store.getLatest();
    if (!latest) {
      res.status(404).json({ error: 'no_data', message: '아직 수집된 샘플이 없습니다' });
      return;
    }
    res.json(latest);
  });

  api.get('/history', (req, res) => {
    const limit = intParam(req.query.limit, 300, 1, store.maxCapacity);
    const since = sinceParam(req.query.since);
    const goodOnly = req.query.goodOnly === 'true';
    const samples = store.getHistory({ limit, sinceEpochMs: since, goodOnly });
    res.json({ count: samples.length, limit, since: since ?? null, samples });
  });

  api.get('/stats', (req, res) => {
    const windowSec = intParam(req.query.window, 60, 1, 86400);
    res.json({ windowSec, stats: store.getStats(windowSec) });
  });

  api.get('/alarms', (req, res) => {
    if (req.query.active === 'true') {
      res.json({ active: alarms.getActive() });
      return;
    }
    const limit = intParam(req.query.limit, 100, 1, 1000);
    res.json({ active: alarms.getActive(), history: alarms.getHistory(limit) });
  });

  app.use('/api/v1', api);

  // ------------------------------------------------------------------
  //  정적 대시보드
  // ------------------------------------------------------------------
  const publicDir = path.resolve(__dirname, '..', '..', 'public');
  app.use(express.static(publicDir, { index: 'index.html' }));

  // ---- 404 / 에러 핸들러 ----
  app.use((_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    log.error('요청 처리 오류', { err });
    res.status(500).json({ error: 'internal_error', message: err.message });
  });

  const server = http.createServer(app);
  return { app, server };
}
