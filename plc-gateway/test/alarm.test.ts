/**
 * AlarmEngine 단위 테스트 - 히스테리시스 및 상태 전이
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AlarmEngine } from '../src/core/AlarmEngine';
import type { Alarm, TagDefinition } from '../src/types';
import { makeSample } from './helpers';

const tags: TagDefinition[] = [
  { name: 'temperature', label: '온도', process: 'T', group: '온도', kind: 'analog', unit: '℃', register: 0, scale: 1, offset: 0, signed: true, decimals: 1, alarm: { high: 80, low: -10, hysteresis: 2 } },
  { name: 'pressure', label: '압력', process: 'T', group: '압력', kind: 'analog', unit: 'bar', register: 1, scale: 1, offset: 0, signed: true, decimals: 2, alarm: { high: 8, hysteresis: 0.2 } },
  { name: 'ng', label: 'NG', process: 'T', group: 'NG', kind: 'digital', unit: 'ON/OFF', register: 2, scale: 1, offset: 0, signed: false, decimals: 0, alarm: { high: 0.5, hysteresis: 0 } },
];

test('HIGH 알람은 임계값 초과 시 발생하고 히스테리시스 아래로 내려와야 해제된다', () => {
  const engine = new AlarmEngine(tags, 100);
  const events: Alarm[] = [];
  engine.on('alarm', (a) => events.push(a));

  engine.evaluate(makeSample({ temperature: 79.9, pressure: 3, ng: 0 })); // 미발생
  engine.evaluate(makeSample({ temperature: 80.1, pressure: 3, ng: 0 })); // 발생
  engine.evaluate(makeSample({ temperature: 79.0, pressure: 3, ng: 0 })); // 히스테리시스 구간 → 유지
  engine.evaluate(makeSample({ temperature: 78.0, pressure: 3, ng: 0 })); // 해제 (<= 80-2)

  assert.equal(events.length, 2);
  assert.equal(events[0].state, 'ACTIVE');
  assert.equal(events[0].level, 'HIGH');
  assert.equal(events[0].value, 80.1);
  assert.equal(events[1].state, 'CLEARED');
  assert.equal(events[1].id, events[0].id);
  assert.ok(events[1].clearedAt);
  assert.equal(engine.getActive().length, 0);
});

test('LOW 알람과 태그별 독립 평가', () => {
  const engine = new AlarmEngine(tags, 100);
  engine.evaluate(makeSample({ temperature: -11, pressure: 9 }));
  const active = engine.getActive();
  assert.equal(active.length, 2);
  assert.deepEqual(active.map((a) => `${a.tag}:${a.level}`).sort(), ['pressure:HIGH', 'temperature:LOW']);

  engine.evaluate(makeSample({ temperature: -8, pressure: 9 })); // 온도만 해제 (>= -10+2)
  assert.deepEqual(engine.getActive().map((a) => a.tag), ['pressure']);
});

test('BAD 샘플은 알람 상태를 바꾸지 않는다', () => {
  const engine = new AlarmEngine(tags, 100);
  engine.evaluate(makeSample({ temperature: 90, pressure: 3 }));
  assert.equal(engine.getActive().length, 1);
  engine.evaluate(makeSample({ temperature: null, pressure: null }, 'BAD'));
  assert.equal(engine.getActive().length, 1);
});

test('이력은 용량을 초과하지 않으며 최신순으로 반환된다', () => {
  const engine = new AlarmEngine(tags, 3);
  for (let i = 0; i < 5; i++) {
    engine.evaluate(makeSample({ temperature: 90, pressure: 3 }));
    engine.evaluate(makeSample({ temperature: 20, pressure: 3 }));
  }
  const h = engine.getHistory();
  assert.equal(h.length, 3);
  assert.equal(h[0].state, 'CLEARED'); // 가장 최근 이벤트
});

test('digital 태그는 값 1에서 발생, 0에서 해제된다 (히스테리시스 0)', () => {
  const engine = new AlarmEngine(tags, 100);
  engine.evaluate(makeSample({ temperature: 20, pressure: 3, ng: 1 }));
  assert.deepEqual(engine.getActive().map((a) => `${a.tag}:${a.level}`), ['ng:HIGH']);
  engine.evaluate(makeSample({ temperature: 20, pressure: 3, ng: 0 }));
  assert.equal(engine.getActive().length, 0);
});
