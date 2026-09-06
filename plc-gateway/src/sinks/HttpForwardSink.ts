/**
 * =====================================================================
 *  HTTP 전달 싱크
 * =====================================================================
 *
 *  수집된 샘플을 상위 서버(예: 메인 웹 애플리케이션의 수집 API, 데이터레이크 인제스트
 *  엔드포인트)로 배치 POST 합니다.
 *
 *  전송 정책
 *   - SINK_HTTP_BATCH_SIZE 건이 모이거나 SINK_HTTP_FLUSH_MS 가 경과하면 전송
 *   - 전송 실패 시 배치를 버퍼 앞쪽에 되돌려 다음 주기에 재시도
 *   - 버퍼가 SINK_HTTP_MAX_BUFFER 를 넘으면 가장 오래된 샘플부터 폐기
 *     (상위 서버 장기 장애 시 메모리 폭주 방지. 폐기 건수는 로그로 남김)
 *   - 동시에 하나의 전송만 진행 (순서 보장)
 *
 *  요청 형식
 *   POST {SINK_HTTP_URL}
 *   Authorization: Bearer {SINK_HTTP_TOKEN}   (설정 시)
 *   Content-Type: application/json
 *   { "source": "plc-gateway", "samples": [ ...Sample ] }
 * =====================================================================
 */

import type { Sample, Sink } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('sink:http');

export interface HttpForwardSinkOptions {
  url: string;
  token?: string;
  batchSize: number;
  flushIntervalMs: number;
  maxBuffer: number;
  /** 요청 타임아웃 (ms) */
  requestTimeoutMs?: number;
}

export class HttpForwardSink implements Sink {
  readonly name = 'http-forward';
  private buffer: Sample[] = [];
  private timer: NodeJS.Timeout | null;
  private sending = false;
  private droppedTotal = 0;

  constructor(private readonly opts: HttpForwardSinkOptions) {
    this.timer = setInterval(() => void this.flush(), opts.flushIntervalMs);
    this.timer.unref();
    log.info('HTTP 전달 싱크 활성화', { url: opts.url, batchSize: opts.batchSize });
  }

  write(sample: Sample): void {
    this.buffer.push(sample);

    // 버퍼 상한 초과 시 오래된 것부터 폐기
    if (this.buffer.length > this.opts.maxBuffer) {
      const drop = this.buffer.length - this.opts.maxBuffer;
      this.buffer.splice(0, drop);
      this.droppedTotal += drop;
      log.warn('HTTP 싱크 버퍼 초과로 샘플 폐기', { dropped: drop, droppedTotal: this.droppedTotal });
    }

    if (this.buffer.length >= this.opts.batchSize) {
      void this.flush();
    }
  }

  /** 버퍼의 샘플을 배치 단위로 전송 */
  async flush(): Promise<void> {
    if (this.sending || this.buffer.length === 0) return;
    this.sending = true;

    try {
      // 전송 중 새로 들어오는 샘플과 섞이지 않도록 배치를 분리
      const batch = this.buffer.splice(0, this.opts.batchSize);
      const ok = await this.post(batch);
      if (!ok) {
        // 실패: 순서 유지를 위해 앞쪽에 되돌림 (최대 버퍼는 write 에서 관리)
        this.buffer.unshift(...batch);
      }
    } finally {
      this.sending = false;
    }
  }

  /** 실제 HTTP POST. 성공 시 true, 실패 시 false (예외 삼킴) */
  private async post(samples: Sample[]): Promise<boolean> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.opts.requestTimeoutMs ?? 5000);

    try {
      const res = await fetch(this.opts.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.opts.token ? { Authorization: `Bearer ${this.opts.token}` } : {}),
        },
        body: JSON.stringify({ source: 'plc-gateway', samples }),
        signal: controller.signal,
      });

      if (!res.ok) {
        log.warn('HTTP 전달 실패 (응답 오류)', { status: res.status, count: samples.length });
        return false;
      }
      log.debug('HTTP 전달 성공', { count: samples.length });
      return true;
    } catch (err) {
      log.warn('HTTP 전달 실패 (네트워크)', { err, count: samples.length });
      return false;
    } finally {
      clearTimeout(timer);
    }
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    // 남은 샘플을 최대한 전송 (배치 여러 번)
    while (this.buffer.length > 0) {
      const before = this.buffer.length;
      await this.flush();
      if (this.buffer.length >= before) break; // 진전이 없으면 포기
    }
    log.info('HTTP 전달 싱크 종료', { remaining: this.buffer.length });
  }
}
