/**
 * Poller 단위 테스트
 *  - 주기적으로 sample 이벤트가 발행되는지
 *  - 읽기 실패 시 BAD 샘플이 발행되고 루프가 살아있는지
 *  - 타임아웃이 적용되는지
 *  - 연결 실패 시 백오프 후 재접속하는지
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Poller, withTimeout } from '../src/core/Poller';
import type { Sample } from '../src/types';
import { FakeDriver, sleep } from './helpers';

const fastOpts = { intervalMs: 50, timeoutMs: 30, reconnectBaseMs: 60, reconnectMaxMs: 200 };

test('주기마다 GOOD 샘플을 발행한다', async () => {
  const driver = new FakeDriver();
  const poller = new Poller(driver, fastOpts);
  const samples: Sample[] = [];
  poller.on('sample', (s) => samples.push(s));

  await poller.start();
  await sleep(fastOpts.intervalMs * 5 + 20);
  await poller.stop();

  assert.ok(samples.length >= 4, `샘플 수 부족: ${samples.length}`);
  assert.ok(samples.every((s) => s.quality === 'GOOD'));
  assert.deepEqual(samples[0].values, { temperature: 25, pressure: 3 });
  // seq 는 1부터 단조 증가
  samples.forEach((s, i) => assert.equal(s.seq, i + 1));
});

test('읽기 실패 시 BAD 샘플을 발행하고 루프가 계속된다', async () => {
  const driver = new FakeDriver();
  driver.queue.push(() => {
    throw new Error('boom');
  });
  const poller = new Poller(driver, fastOpts);
  const samples: Sample[] = [];
  const errors: Error[] = [];
  let disconnected = 0;
  poller.on('sample', (s) => samples.push(s));
  poller.on('readError', (e) => errors.push(e));
  poller.on('disconnected', () => disconnected++);

  await poller.start();
  await sleep(fastOpts.intervalMs * 8);
  await poller.stop();

  const bad = samples.filter((s) => s.quality === 'BAD');
  const good = samples.filter((s) => s.quality === 'GOOD');
  assert.equal(errors.length, 1);
  assert.equal(disconnected, 1);
  assert.ok(bad.length >= 1, 'BAD 샘플이 있어야 함');
  assert.equal(bad[0].error, 'boom');
  assert.deepEqual(bad[0].values, { temperature: null, pressure: null });
  assert.ok(good.length >= 2, '실패 후 재접속하여 GOOD 샘플이 다시 나와야 함');
  // 재접속이 일어났어야 함 (초기 1회 + 재접속 1회 이상)
  assert.ok(driver.connectCalls >= 2);
  const st = poller.getStats();
  assert.equal(st.badSamples, bad.length);
  assert.equal(st.goodSamples, good.length);
});

test('읽기가 타임아웃을 넘기면 BAD 샘플로 기록된다', async () => {
  const driver = new FakeDriver();
  driver.queue.push(async () => {
    await sleep(fastOpts.timeoutMs * 3);
    return { temperature: 1, pressure: 1 };
  });
  const poller = new Poller(driver, fastOpts);
  const samples: Sample[] = [];
  poller.on('sample', (s) => samples.push(s));

  await poller.start();
  await sleep(fastOpts.intervalMs * 4);
  await poller.stop();

  assert.equal(samples[0].quality, 'BAD');
  assert.match(samples[0].error ?? '', /타임아웃/);
});

test('연결 실패 시 백오프 후 재접속하며, 대기 중에도 BAD 샘플을 발행한다', async () => {
  const driver = new FakeDriver();
  driver.failConnect = true;
  const poller = new Poller(driver, fastOpts);
  const samples: Sample[] = [];
  let connected = 0;
  poller.on('sample', (s) => samples.push(s));
  poller.on('connected', () => connected++);

  await poller.start(); // 첫 연결 실패
  await sleep(fastOpts.intervalMs * 3);
  assert.ok(samples.length >= 2);
  assert.ok(samples.every((s) => s.quality === 'BAD'));
  assert.equal(connected, 0);

  // 연결 가능 상태로 전환 → 백오프 만료 후 재접속
  driver.failConnect = false;
  await sleep(fastOpts.reconnectMaxMs + fastOpts.intervalMs * 3);
  await poller.stop();

  assert.equal(connected, 1);
  assert.ok(samples.some((s) => s.quality === 'GOOD'));
});

test('withTimeout 은 시간 초과 시 reject 한다', async () => {
  await assert.rejects(withTimeout(sleep(100), 10, 'slow'), /slow \(10ms\)/);
  assert.equal(await withTimeout(Promise.resolve(42), 10, 'x'), 42);
});
