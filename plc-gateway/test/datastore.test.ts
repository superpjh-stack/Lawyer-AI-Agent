/**
 * DataStore(링버퍼) 단위 테스트
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DataStore } from '../src/core/DataStore';
import { TEST_TAG_NAMES, makeSample } from './helpers';

test('용량을 초과하면 가장 오래된 샘플부터 덮어쓴다', () => {
  const store = new DataStore(3, TEST_TAG_NAMES);
  for (let i = 1; i <= 5; i++) store.push(makeSample({ temperature: i, pressure: i }, 'GOOD', i * 1000));
  assert.equal(store.length, 3);
  const h = store.getHistory();
  assert.deepEqual(h.map((s) => s.values.temperature), [3, 4, 5]);
  assert.equal(store.getLatest()?.values.temperature, 5);
});

test('getHistory 는 limit / since / goodOnly 를 적용하고 시간순으로 반환한다', () => {
  const store = new DataStore(100, TEST_TAG_NAMES);
  for (let i = 1; i <= 10; i++) {
    store.push(makeSample({ temperature: i, pressure: i }, i % 3 === 0 ? 'BAD' : 'GOOD', i * 1000));
  }
  assert.deepEqual(store.getHistory({ limit: 2 }).map((s) => s.values.temperature), [9, 10]);
  assert.deepEqual(store.getHistory({ sinceEpochMs: 8000 }).map((s) => s.values.temperature), [8, 9, 10]);
  assert.deepEqual(store.getHistory({ goodOnly: true, limit: 3 }).map((s) => s.values.temperature), [7, 8, 10]);
});

test('getStats 는 GOOD 샘플만 집계한다', () => {
  const store = new DataStore(100, TEST_TAG_NAMES);
  const now = Date.now();
  store.push(makeSample({ temperature: 10, pressure: 1 }, 'GOOD', now - 3000));
  store.push(makeSample({ temperature: null, pressure: null }, 'BAD', now - 2000));
  store.push(makeSample({ temperature: 30, pressure: 3 }, 'GOOD', now - 1000));
  const st = store.getStats(60);
  assert.equal(st.temperature.count, 2);
  assert.equal(st.temperature.min, 10);
  assert.equal(st.temperature.max, 30);
  assert.equal(st.temperature.avg, 20);
  assert.equal(st.temperature.last, 30);
  assert.equal(st.pressure.avg, 2);
});

test('잘못된 용량은 거부한다', () => {
  assert.throws(() => new DataStore(0, TEST_TAG_NAMES));
  assert.throws(() => new DataStore(1.5));
});
