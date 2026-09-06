/**
 * 설정 로더 테스트
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config';

test('환경변수 없이 기본값으로 시뮬레이터 설정을 만든다', () => {
  const cfg = loadConfig({});
  assert.equal(cfg.env.PLC_DRIVER, 'simulator');
  assert.equal(cfg.env.POLL_INTERVAL_MS, 1000);
  assert.equal(cfg.tags.length, 2);
  assert.equal(cfg.tags[0].name, 'temperature');
  assert.equal(cfg.tags[0].alarm?.high, 80);
});

test('숫자/불리언/임계값 비활성화 파싱', () => {
  const cfg = loadConfig({
    PLC_DRIVER: 'modbus-tcp',
    PLC_PORT: '5020',
    PLC_REGISTER_SIGNED: 'false',
    ALARM_TEMP_HIGH: '',
    ALARM_PRESSURE_LOW: '1.5',
  });
  assert.equal(cfg.env.PLC_PORT, 5020);
  assert.equal(cfg.tags[0].signed, false);
  assert.equal(cfg.tags[0].alarm?.high, undefined);
  assert.equal(cfg.tags[1].alarm?.low, 1.5);
});

test('잘못된 값은 기동 시 실패한다', () => {
  assert.throws(() => loadConfig({ POLL_INTERVAL_MS: 'abc' }), /환경변수 검증 실패/);
  assert.throws(() => loadConfig({ POLL_INTERVAL_MS: '500', POLL_TIMEOUT_MS: '500' }), /POLL_TIMEOUT_MS/);
  assert.throws(() => loadConfig({ PLC_DRIVER: 'opcua' }));
});
