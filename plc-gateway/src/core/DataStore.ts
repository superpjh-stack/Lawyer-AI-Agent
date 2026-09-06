/**
 * =====================================================================
 *  데이터 저장소 (DataStore) - 인메모리 링버퍼
 * =====================================================================
 *
 *  최근 N개(기본 3600 = 1시간 분량 @1Hz)의 샘플을 고정 크기 링버퍼에 보관합니다.
 *  - 메모리 사용량이 일정하게 유지됨 (오래된 샘플은 자동으로 덮어씀)
 *  - 최신값 조회 O(1), 이력 조회 O(limit), 통계 O(window)
 *
 *  장기 보관은 이 저장소의 책임이 아닙니다. JSONL 파일 싱크나 HTTP 전달 싱크가
 *  샘플을 외부로 내보내며, 이 저장소는 API 응답용 "핫 데이터" 만 담당합니다.
 * =====================================================================
 */

import type { Sample, TagName, TagStats } from '../types';
import { TAG_NAMES } from '../types';

export interface HistoryQuery {
  /** 최대 반환 개수 (최신순 정렬 후 잘라냄) */
  limit?: number;
  /** 이 시각(epoch ms) 이후 샘플만 */
  sinceEpochMs?: number;
  /** GOOD 품질만 반환할지 여부 */
  goodOnly?: boolean;
}

export class DataStore {
  private readonly buffer: (Sample | undefined)[];
  /** 다음 쓰기 위치 */
  private head = 0;
  /** 현재 저장된 샘플 수 (capacity 까지 증가 후 고정) */
  private size = 0;
  private latest: Sample | null = null;

  constructor(private readonly capacity: number) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error(`HISTORY_CAPACITY 는 양의 정수여야 합니다: ${capacity}`);
    }
    this.buffer = new Array(capacity);
  }

  /** 샘플 1건 저장 (가장 오래된 것부터 덮어씀) */
  push(sample: Sample): void {
    this.buffer[this.head] = sample;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) this.size += 1;
    this.latest = sample;
  }

  /** 가장 최근 샘플 (없으면 null) */
  getLatest(): Sample | null {
    return this.latest;
  }

  /** 저장된 샘플 수 */
  get length(): number {
    return this.size;
  }

  /** 링버퍼 용량 */
  get maxCapacity(): number {
    return this.capacity;
  }

  /**
   * 이력 조회. **오래된 → 최신** 순으로 정렬된 배열을 반환합니다.
   * (차트에 바로 그릴 수 있는 시간순)
   */
  getHistory(query: HistoryQuery = {}): Sample[] {
    const { limit, sinceEpochMs, goodOnly } = query;
    const out: Sample[] = [];

    // 최신부터 역순으로 순회하며 조건에 맞는 것을 수집 (limit 도달 시 중단)
    for (let i = 0; i < this.size; i++) {
      const idx = (this.head - 1 - i + this.capacity) % this.capacity;
      const s = this.buffer[idx];
      if (!s) break;
      if (sinceEpochMs !== undefined && s.epochMs < sinceEpochMs) break; // 시간순 저장이므로 더 볼 필요 없음
      if (goodOnly && s.quality !== 'GOOD') continue;
      out.push(s);
      if (limit !== undefined && out.length >= limit) break;
    }

    return out.reverse();
  }

  /**
   * 최근 windowSec 초 동안의 태그별 통계 (GOOD 샘플만 집계).
   * @param windowSec 시간 창 (초). 예) 60 → 최근 1분
   */
  getStats(windowSec: number): Record<TagName, TagStats> {
    const since = Date.now() - windowSec * 1000;
    const samples = this.getHistory({ sinceEpochMs: since, goodOnly: true });

    const stats = {} as Record<TagName, TagStats>;
    for (const name of TAG_NAMES) {
      let count = 0;
      let min: number | null = null;
      let max: number | null = null;
      let sum = 0;
      let last: number | null = null;

      for (const s of samples) {
        const v = s.values[name];
        if (v === null || v === undefined) continue;
        count += 1;
        sum += v;
        if (min === null || v < min) min = v;
        if (max === null || v > max) max = v;
        last = v;
      }

      stats[name] = {
        count,
        min,
        max,
        avg: count > 0 ? sum / count : null,
        last,
      };
    }
    return stats;
  }

  /** 테스트/재기동용 초기화 */
  clear(): void {
    this.buffer.fill(undefined);
    this.head = 0;
    this.size = 0;
    this.latest = null;
  }
}
