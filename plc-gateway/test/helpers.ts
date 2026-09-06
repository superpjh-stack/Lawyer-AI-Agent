/**
 * 테스트 공통 헬퍼
 *  - FakeDriver: 읽기 결과/실패를 스크립트로 제어할 수 있는 가짜 PLC 드라이버
 *  - makeSample: 테스트용 Sample 생성기
 */
import type { PlcDriver, PlcReadResult } from '../src/drivers/PlcDriver';
import type { Sample } from '../src/types';

export class FakeDriver implements PlcDriver {
  readonly name = 'fake';
  connected = false;
  /** 다음 read() 호출들에 대한 스크립트. 함수가 throw 하면 실패로 처리 */
  queue: Array<() => Promise<PlcReadResult> | PlcReadResult> = [];
  connectCalls = 0;
  /** true 면 connect() 가 실패 */
  failConnect = false;
  /** 마지막 read 값 (queue 가 비면 이 값을 반환) */
  fallback: PlcReadResult = { temperature: 25, pressure: 3 };

  get isConnected(): boolean {
    return this.connected;
  }
  async connect(): Promise<void> {
    this.connectCalls += 1;
    if (this.failConnect) throw new Error('connect failed');
    this.connected = true;
  }
  async read(): Promise<PlcReadResult> {
    const next = this.queue.shift();
    if (!next) return this.fallback;
    return next();
  }
  async disconnect(): Promise<void> {
    this.connected = false;
  }
}

let seq = 0;
export function makeSample(values: { temperature: number | null; pressure: number | null }, quality: 'GOOD' | 'BAD' = 'GOOD', epochMs = Date.now()): Sample {
  seq += 1;
  return {
    seq,
    ts: new Date(epochMs).toISOString(),
    epochMs,
    values,
    quality,
    latencyMs: 1,
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
