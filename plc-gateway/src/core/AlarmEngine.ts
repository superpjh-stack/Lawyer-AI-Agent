/**
 * =====================================================================
 *  알람 엔진 (AlarmEngine)
 * =====================================================================
 *
 *  매 샘플마다 태그별 임계값을 평가하여 HIGH/LOW 알람을 발생·해제합니다.
 *
 *  히스테리시스(hysteresis) 적용 규칙
 *   - HIGH 발생: value >  high
 *   - HIGH 해제: value <= high - hysteresis
 *   - LOW  발생: value <  low
 *   - LOW  해제: value >= low + hysteresis
 *   센서 노이즈로 임계값 근처에서 알람이 깜빡이는 현상을 막습니다.
 *
 *  품질이 BAD 인 샘플(값 null)은 평가하지 않고 기존 알람 상태를 유지합니다.
 *  (통신 장애를 "정상 복귀" 로 오판하지 않기 위함)
 *
 *  이벤트
 *   - 'alarm' : Alarm 객체 (state=ACTIVE 발생 / CLEARED 해제)
 * =====================================================================
 */

import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import type { Alarm, AlarmLevel, Sample, TagDefinition, TagName } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('alarm');

export class AlarmEngine extends EventEmitter {
  /** 현재 활성 알람: key = `${tag}:${level}` */
  private active = new Map<string, Alarm>();
  /** 알람 이력 (최신이 뒤). 용량 초과 시 앞에서 제거 */
  private history: Alarm[] = [];

  constructor(
    private readonly tags: TagDefinition[],
    private readonly historyCapacity: number,
  ) {
    super();
  }

  override on(event: 'alarm', listener: (alarm: Alarm) => void): this {
    return super.on(event, listener);
  }

  /** 샘플 1건 평가 */
  evaluate(sample: Sample): void {
    if (sample.quality !== 'GOOD') return;

    for (const tag of this.tags) {
      const value = sample.values[tag.name];
      if (value === null || value === undefined || !tag.alarm) continue;

      const { high, low, hysteresis } = tag.alarm;

      if (high !== undefined) {
        this.evaluateOne(tag.name, 'HIGH', value, high, sample.ts, {
          shouldRaise: value > high,
          shouldClear: value <= high - hysteresis,
        });
      }
      if (low !== undefined) {
        this.evaluateOne(tag.name, 'LOW', value, low, sample.ts, {
          shouldRaise: value < low,
          shouldClear: value >= low + hysteresis,
        });
      }
    }
  }

  /** 단일 (태그, 레벨) 조합의 상태 전이 처리 */
  private evaluateOne(
    tag: TagName,
    level: AlarmLevel,
    value: number,
    threshold: number,
    ts: string,
    cond: { shouldRaise: boolean; shouldClear: boolean },
  ): void {
    const key = `${tag}:${level}`;
    const existing = this.active.get(key);

    if (!existing && cond.shouldRaise) {
      // ---- 발생 ----
      const alarm: Alarm = {
        id: randomUUID(),
        tag,
        level,
        state: 'ACTIVE',
        value,
        threshold,
        raisedAt: ts,
      };
      this.active.set(key, alarm);
      this.record(alarm);
      log.warn('알람 발생', { tag, level, value, threshold });
      this.emit('alarm', alarm);
    } else if (existing && cond.shouldClear) {
      // ---- 해제 ----
      const cleared: Alarm = {
        ...existing,
        state: 'CLEARED',
        value,
        clearedAt: ts,
      };
      this.active.delete(key);
      this.record(cleared);
      log.info('알람 해제', { tag, level, value, threshold });
      this.emit('alarm', cleared);
    }
  }

  /** 이력에 추가 (용량 제한) */
  private record(alarm: Alarm): void {
    this.history.push(alarm);
    if (this.history.length > this.historyCapacity) {
      this.history.splice(0, this.history.length - this.historyCapacity);
    }
  }

  /** 현재 활성 알람 목록 */
  getActive(): Alarm[] {
    return [...this.active.values()];
  }

  /** 알람 이력 (최신순) */
  getHistory(limit = 100): Alarm[] {
    return this.history.slice(-limit).reverse();
  }
}
