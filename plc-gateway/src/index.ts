/**
 * =====================================================================
 *  PLC Data Gateway - 진입점
 * =====================================================================
 *
 *  구성 요소 배선(wiring) 순서
 *   1. 설정 로드 및 검증            (config.ts)
 *   2. PLC 드라이버 생성            (drivers/)
 *   3. 폴러 생성                    (core/Poller)        - 1초 주기 수집
 *   4. 저장소 / 알람 엔진 / 싱크     (core/DataStore, core/AlarmEngine, sinks/)
 *   5. 폴러 이벤트 → 저장소·알람·싱크 연결
 *   6. HTTP + WebSocket 서버 기동   (server/)
 *   7. 폴링 시작
 *   8. 종료 시그널 처리 (graceful shutdown)
 *
 *  데이터 흐름
 *   PLC ──(driver.read)──▶ Poller ──'sample'──▶ DataStore  (API 조회용 링버퍼)
 *                                          ├──▶ AlarmEngine (임계값 평가 → 'alarm')
 *                                          ├──▶ Sinks       (JSONL 파일 / HTTP 전달)
 *                                          └──▶ WebSocket   (실시간 브로드캐스트)
 * =====================================================================
 */

import { loadConfig } from './config';
import { AlarmEngine } from './core/AlarmEngine';
import { DataStore } from './core/DataStore';
import { Poller } from './core/Poller';
import { createDriver } from './drivers';
import { createHttpServer } from './server/httpServer';
import { createWsServer } from './server/wsServer';
import { createSinks } from './sinks';
import { createLogger, setLogLevel } from './utils/logger';

const log = createLogger('main');

async function main(): Promise<void> {
  const startedAt = Date.now();

  // 1. 설정
  const config = loadConfig();
  setLogLevel(config.env.LOG_LEVEL);
  log.info('PLC Data Gateway 기동', {
    driver: config.env.PLC_DRIVER,
    intervalMs: config.env.POLL_INTERVAL_MS,
    tags: config.tags.map((t) => `${t.name}(${t.unit})`),
    nodeEnv: config.env.NODE_ENV,
  });

  // 2~4. 핵심 객체 생성
  const driver = createDriver(config);
  const poller = new Poller(driver, {
    intervalMs: config.env.POLL_INTERVAL_MS,
    timeoutMs: config.env.POLL_TIMEOUT_MS,
    reconnectBaseMs: config.env.RECONNECT_BASE_MS,
    reconnectMaxMs: config.env.RECONNECT_MAX_MS,
  });
  const store = new DataStore(config.env.HISTORY_CAPACITY);
  const alarms = new AlarmEngine(config.tags, config.env.ALARM_HISTORY_CAPACITY);
  const sinks = createSinks(config);

  // 5. 이벤트 배선
  poller.on('sample', (sample) => {
    store.push(sample);
    alarms.evaluate(sample);
    for (const sink of sinks) {
      // 싱크 오류는 폴링에 영향을 주지 않도록 개별 격리
      try {
        const r = sink.write(sample);
        if (r instanceof Promise) r.catch((err) => log.error('싱크 쓰기 실패', { sink: sink.name, err }));
      } catch (err) {
        log.error('싱크 쓰기 실패', { sink: sink.name, err });
      }
    }
  });
  poller.on('connected', () => log.info('PLC 연결 상태: 연결됨'));
  poller.on('disconnected', (reason) => log.warn('PLC 연결 상태: 끊김', { reason }));

  // 6. 서버 기동
  const { server } = createHttpServer({ config, poller, store, alarms, startedAt });
  const wss = createWsServer({ server, config, poller, store, alarms });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.env.HTTP_PORT, config.env.HTTP_HOST, () => {
      server.off('error', reject);
      resolve();
    });
  });
  log.info('HTTP/WS 서버 대기 중', {
    url: `http://${config.env.HTTP_HOST}:${config.env.HTTP_PORT}`,
    ws: `ws://${config.env.HTTP_HOST}:${config.env.HTTP_PORT}/ws`,
    apiKeyRequired: Boolean(config.env.GATEWAY_API_KEY),
  });

  // 7. 폴링 시작 (서버가 먼저 떠야 초기 샘플부터 WS 로 전달됨)
  await poller.start();

  // 8. Graceful shutdown
  let shuttingDown = false;
  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;
    log.info('종료 시작', { signal });

    // 강제 종료 타이머: 10초 내 정리가 끝나지 않으면 강제 종료
    const force = setTimeout(() => {
      log.error('정리 시간 초과, 강제 종료');
      process.exit(1);
    }, 10_000);
    force.unref();

    try {
      await poller.stop();
      for (const client of wss.clients) client.close(1001, 'server shutdown');
      wss.close();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      for (const sink of sinks) {
        try {
          await sink.close?.();
        } catch (err) {
          log.error('싱크 종료 실패', { sink: sink.name, err });
        }
      }
      log.info('종료 완료');
      process.exit(0);
    } catch (err) {
      log.error('종료 중 오류', { err });
      process.exit(1);
    }
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('unhandledRejection', (reason) => log.error('unhandledRejection', { reason }));
  process.on('uncaughtException', (err) => {
    log.error('uncaughtException', { err });
    void shutdown('uncaughtException');
  });
}

main().catch((err) => {
  // 기동 실패 (설정 오류, 포트 충돌 등)
  log.error('기동 실패', { err });
  process.exit(1);
});
