/**
 * 테스트 공통 헬퍼
 *  - TEST_TAGS  : 테스트용 최소 태그 세트 2개 (온도 analog, 카운터)
 *  - FakeDriver : 읽기 결과/실패를 스크립트로 제어할 수 있는 가짜 PLC 드라이버
 *  - makeSample : 테스트용 Sample 생성기
 */
import type { PlcDriver, PlcReadResult } from '../src/drivers/PlcDriver';
import type { Sample, TagDefinition } from '../src/types';

export const TEST_TAGS: TagDefinition[] = [
  { name: 'temperature', label: '온도', process: '테스트', group: '온도', kind: 'analog', unit: '℃', register: 0, scale: 0.1, offset: 0, signed: true, decimals: 1, alarm: { high: 80, low: -10, hysteresis: 2 } },
  { name: 'pressure', label: '압력', process: '테스트', group: '압력', kind: 'analog', unit: 'bar', register: 1, scale: 0.01, offset: 0, signed: true, decimals: 2, alarm: { high: 8, hysteresis: 0.2 } },
];
export const TEST_TAG_NAMES = TEST_TAGS.map((t) => t.name);

export class FakeDriver implements PlcDriver {
  readonly name = 'fake';
  connected = false;
  /** 다음 read() 호출들에 대한 스크립트. 함수가 throw 하면 실패로 처리 */
  queue: Array<() => Promise<PlcReadResult> | PlcReadResult> = [];
  connectCalls = 0;
  /** true 면 connect() 가 실패 */
  failConnect = false;
  /** queue 가 비면 반환하는 기본값 */
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
export function makeSample(values: Record<string, number | null>, quality: 'GOOD' | 'BAD' = 'GOOD', epochMs = Date.now()): Sample {
  seq += 1;
  return { seq, ts: new Date(epochMs).toISOString(), epochMs, values, quality, latencyMs: 1 };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
