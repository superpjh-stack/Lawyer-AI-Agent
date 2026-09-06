/**
 * =====================================================================
 *  폴러 (Poller) - 1초 고정 주기 수집 스케줄러
 * =====================================================================
 *
 *  핵심 책임
 *   1. **고정 주기(fixed-rate) 스케줄링**
 *      setInterval 은 이벤트 루프 지연이 누적되어 시간이 갈수록 밀립니다.
 *      대신 "다음 틱 = 기준시각 + n × 주기" 를 계산하고 setTimeout 으로
 *      그 시각까지 정확히 대기하여 드리프트를 보정합니다.
 *      (예: 12:00:00.000, 12:00:01.000, 12:00:02.000 ... 에 정렬)
 *
 *   2. **타임아웃 보호**
 *      PLC 응답이 POLL_TIMEOUT_MS 를 넘으면 해당 틱을 BAD 로 기록하고
 *      다음 틱과 겹치지 않게 합니다. (읽기 중 다음 틱이 오면 그 틱은 건너뜀)
 *
 *   3. **자동 재접속 (지수 백오프)**
 *      통신 오류가 나면 연결을 끊고, RECONNECT_BASE_MS 부터 2배씩 늘려
 *      RECONNECT_MAX_MS 까지 대기하며 재접속을 시도합니다.
 *      재접속 대기 중에도 매 틱마다 BAD 샘플을 발행하여
 *      상위 시스템이 "데이터 없음" 을 명확히 알 수 있게 합니다.
 *
 *   4. **이벤트 발행**
 *      - 'sample'      : 매 틱 Sample 1건
 *      - 'connected'   : PLC 연결 성공
 *      - 'disconnected': PLC 연결 끊김 (원인 포함)
 *      - 'readError'   : 읽기 오류 (로그/모니터링 용도)
 *        ※ 이름을 'error' 로 하지 않는 이유: Node EventEmitter 는 'error' 이벤트에
 *          리스너가 없으면 emit 시점에 예외를 던지므로 폴링 루프가 깨질 수 있음
 *
 *  폴러는 저장소/싱크/서버를 전혀 알지 못합니다. index.ts 에서 이벤트를 배선합니다.
 * =====================================================================
 */

import { EventEmitter } from 'node:events';
import type { PlcDriver, PlcReadResult } from '../drivers/PlcDriver';
import type { Quality, Sample, TagValues } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('poller');

export interface PollerOptions {
  /** 수집 태그 이름 목록 (샘플 values 의 키 순서) */
  tagNames: string[];
  /** 폴링 주기 (ms). 기본 1000 */
  intervalMs: number;
  /** 1회 읽기 타임아웃 (ms). intervalMs 보다 작아야 함 */
  timeoutMs: number;
  /** 재접속 백오프 시작값 (ms) */
  reconnectBaseMs: number;
  /** 재접속 백오프 상한 (ms) */
  reconnectMaxMs: number;
}

/** 폴러 런타임 통계 (health API 노출용) */
export interface PollerStats {
  running: boolean;
  connected: boolean;
  driver: string;
  /** 발행한 총 샘플 수 */
  totalSamples: number;
  /** 품질 GOOD 샘플 수 */
  goodSamples: number;
  /** 품질 BAD 샘플 수 */
  badSamples: number;
  /** 이전 틱이 끝나지 않아 건너뛴 틱 수 */
  skippedTicks: number;
  /** 연속 실패 횟수 (성공 시 0으로 리셋) */
  consecutiveFailures: number;
  /** 재접속 시도 횟수 (누적) */
  reconnectAttempts: number;
  /** 마지막 성공 수집 시각 (ISO) */
  lastGoodAt: string | null;
  /** 마지막 오류 메시지 */
  lastError: string | null;
  /** 최근 읽기 지연 (ms) */
  lastLatencyMs: number | null;
}

export interface PollerEvents {
  sample: (sample: Sample) => void;
  connected: () => void;
  disconnected: (reason: string) => void;
  readError: (err: Error) => void;
}

export class Poller extends EventEmitter {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  /** 현재 read() 가 진행 중인지 (틱 겹침 방지) */
  private busy = false;

  /** 시퀀스 번호 (샘플마다 1씩 증가) */
  private seq = 0;
  /** 스케줄 기준 시각과 틱 카운터 - 드리프트 보정용 */
  private baseTime = 0;
  private tickIndex = 0;

  /** 재접속 상태 */
  private nextReconnectAt = 0;
  private reconnectDelay = 0;

  private stats: PollerStats;

  constructor(
    private readonly driver: PlcDriver,
    private readonly opts: PollerOptions,
  ) {
    super();
    this.stats = {
      running: false,
      connected: false,
      driver: driver.name,
      totalSamples: 0,
      goodSamples: 0,
      badSamples: 0,
      skippedTicks: 0,
      consecutiveFailures: 0,
      reconnectAttempts: 0,
      lastGoodAt: null,
      lastError: null,
      lastLatencyMs: null,
    };
  }

  /** 타입이 지정된 on() 오버로드 */
  override on<K extends keyof PollerEvents>(event: K, listener: PollerEvents[K]): this {
    return super.on(event, listener);
  }

  /** 현재 통계 스냅샷 */
  getStats(): PollerStats {
    return { ...this.stats, running: this.running, connected: this.driver.isConnected };
  }

  /**
   * 폴링 시작.
   * 첫 연결을 시도한 뒤(실패해도 무방) 첫 틱을 즉시 스케줄합니다.
   */
  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.stats.running = true;

    await this.tryConnect();

    // 기준 시각을 "다음 정초(整秒)" 에 맞춰 보기 좋게 정렬 (예: xx:xx:05.000)
    const now = Date.now();
    this.baseTime = Math.ceil(now / this.opts.intervalMs) * this.opts.intervalMs;
    this.tickIndex = 0;
    this.scheduleNext();

    log.info('폴링 시작', { intervalMs: this.opts.intervalMs, timeoutMs: this.opts.timeoutMs });
  }

  /** 폴링 중지 및 연결 해제 */
  async stop(): Promise<void> {
    if (!this.running) return;
    this.running = false;
    this.stats.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    await this.driver.disconnect();
    log.info('폴링 중지');
  }

  // ------------------------------------------------------------------
  //  스케줄링
  // ------------------------------------------------------------------

  /**
   * 다음 틱 시각을 계산해 setTimeout 을 겁니다.
   *  - tickIndex 는 "다음에 실행할 틱 번호" 입니다. (0 = baseTime 정각)
   *  - 처리 시간이 주기를 초과해 이미 지난 틱들은 건너뛰고 skippedTicks 에 집계합니다.
   */
  private scheduleNext(): void {
    if (!this.running) return;

    const now = Date.now();
    let nextAt = this.baseTime + this.tickIndex * this.opts.intervalMs;

    // 이미 지난 틱이 있으면 건너뜀 (과도한 catch-up 폭주 방지)
    while (nextAt < now) {
      this.tickIndex += 1;
      this.stats.skippedTicks += 1;
      nextAt += this.opts.intervalMs;
    }

    this.timer = setTimeout(() => {
      this.tickIndex += 1;
      void this.tick();
    }, Math.max(0, nextAt - now));
  }

  /**
   * 틱 1회 처리: 연결 확인 → 읽기(타임아웃) → 샘플 발행 → 다음 틱 예약
   * 어떤 경우에도 예외가 밖으로 새어 나가지 않아야 합니다 (루프 생존 보장).
   */
  private async tick(): Promise<void> {
    if (!this.running) return;

    // 이전 읽기가 아직 끝나지 않았다면 이번 틱은 건너뜀
    if (this.busy) {
      this.stats.skippedTicks += 1;
      log.warn('이전 읽기 미완료로 틱 건너뜀', { seq: this.seq });
      this.scheduleNext();
      return;
    }

    this.busy = true;
    try {
      // 연결이 끊긴 상태면 백오프 규칙에 따라 재접속 시도
      if (!this.driver.isConnected) {
        if (Date.now() >= this.nextReconnectAt) {
          await this.tryConnect();
        }
      }

      if (this.driver.isConnected) {
        await this.readAndEmit();
      } else {
        // 재접속 대기 중: BAD 샘플 발행 (데이터 공백을 명시적으로 기록)
        this.emitSample(null, 0, this.stats.lastError ?? 'PLC 연결 끊김');
      }
    } catch (err) {
      // 이론상 도달하지 않지만, 루프 생존을 위해 최종 방어
      log.error('틱 처리 중 예기치 못한 오류', { err });
    } finally {
      this.busy = false;
      this.scheduleNext();
    }
  }

  // ------------------------------------------------------------------
  //  읽기 / 연결
  // ------------------------------------------------------------------

  /** PLC 를 읽고 결과를 Sample 로 변환해 발행합니다. */
  private async readAndEmit(): Promise<void> {
    const started = Date.now();
    try {
      const result = await withTimeout(this.driver.read(), this.opts.timeoutMs, 'PLC 읽기 타임아웃');
      const latency = Date.now() - started;

      this.stats.consecutiveFailures = 0;
      this.stats.lastLatencyMs = latency;
      this.stats.lastGoodAt = new Date(started).toISOString();
      this.reconnectDelay = 0; // 성공했으니 백오프 리셋

      this.emitSample(result, latency);
    } catch (err) {
      const latency = Date.now() - started;
      const message = err instanceof Error ? err.message : String(err);

      this.stats.consecutiveFailures += 1;
      this.stats.lastError = message;
      this.stats.lastLatencyMs = latency;

      log.warn('PLC 읽기 실패', { message, consecutiveFailures: this.stats.consecutiveFailures });
      this.emit('readError', err instanceof Error ? err : new Error(message));

      // 실패 시 연결을 끊고 재접속 경로로 진입 (반쯤 죽은 소켓 방지)
      await this.markDisconnected(message);
      this.emitSample(null, latency, message);
    }
  }

  /** 연결 시도. 실패하면 백오프 지연을 늘리고 다음 시도 시각을 기록합니다. */
  private async tryConnect(): Promise<void> {
    this.stats.reconnectAttempts += 1;
    try {
      await withTimeout(this.driver.connect(), this.opts.timeoutMs * 2, 'PLC 연결 타임아웃');
      this.reconnectDelay = 0;
      this.stats.connected = true;
      log.info('PLC 연결 성공', { driver: this.driver.name });
      this.emit('connected');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.stats.lastError = message;

      // 지수 백오프: base → base*2 → base*4 ... → max
      this.reconnectDelay =
        this.reconnectDelay === 0
          ? this.opts.reconnectBaseMs
          : Math.min(this.reconnectDelay * 2, this.opts.reconnectMaxMs);
      this.nextReconnectAt = Date.now() + this.reconnectDelay;

      log.warn('PLC 연결 실패, 재시도 예정', { message, retryInMs: this.reconnectDelay });
      this.stats.connected = false;
    }
  }

  /** 연결 끊김 처리: 드라이버 정리 + 이벤트 발행 + 즉시 재접속 예약 */
  private async markDisconnected(reason: string): Promise<void> {
    const wasConnected = this.driver.isConnected;
    try {
      await this.driver.disconnect();
    } catch {
      /* disconnect 는 예외를 던지지 않도록 계약되어 있지만 방어 */
    }
    if (wasConnected || this.stats.connected) {
      this.stats.connected = false;
      this.emit('disconnected', reason);
    }
    // 읽기 실패 직후에는 다음 틱에서 곧바로 재접속을 시도합니다.
    // (일시적 패킷 손실이라면 1초 뒤 바로 복구되어 데이터 공백을 최소화)
    // connect() 자체가 실패하면 그때부터 tryConnect() 의 지수 백오프가 적용됩니다.
    this.nextReconnectAt = 0;
  }

  // ------------------------------------------------------------------
  //  샘플 생성
  // ------------------------------------------------------------------

  /**
   * Sample 객체를 만들어 'sample' 이벤트로 발행합니다.
   * @param result  읽기 결과. null 이면 BAD 품질 샘플
   */
  private emitSample(result: PlcReadResult | null, latencyMs: number, error?: string): void {
    const now = Date.now();
    const quality: Quality = result ? 'GOOD' : 'BAD';

    const values: TagValues = {};
    for (const name of this.opts.tagNames) {
      values[name] = result ? (result[name] ?? null) : null;
    }

    const sample: Sample = {
      seq: ++this.seq,
      ts: new Date(now).toISOString(),
      epochMs: now,
      values,
      quality,
      latencyMs,
      ...(error ? { error } : {}),
    };

    this.stats.totalSamples += 1;
    if (quality === 'GOOD') this.stats.goodSamples += 1;
    else this.stats.badSamples += 1;

    log.debug('sample', { seq: sample.seq, quality, latencyMs, values });
    this.emit('sample', sample);
  }
}

/**
 * Promise 에 타임아웃을 적용합니다.
 * 타임아웃이 먼저 발생하면 지정 메시지로 reject 합니다.
 */
export function withTimeout<T>(p: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${message} (${ms}ms)`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}
