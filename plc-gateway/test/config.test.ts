/**
 * 설정 로더 테스트
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, validateTags } from '../src/config';
import { IMJINGANG_TAGS } from '../src/tags/imjingang';

test('환경변수 없이 기본값으로 시뮬레이터 + 임진강김치 태그 세트를 만든다', () => {
  const cfg = loadConfig({});
  assert.equal(cfg.env.PLC_DRIVER, 'simulator');
  assert.equal(cfg.env.POLL_INTERVAL_MS, 1000);
  assert.equal(cfg.tags.length, IMJINGANG_TAGS.length);
  assert.ok(cfg.tags.some((t) => t.name === 'aging_room_temp'));
  assert.ok(cfg.tags.some((t) => t.name === 'brine_tank1_salinity' && t.alarm?.low === 9 && t.alarm?.high === 11));
  assert.ok(cfg.tags.some((t) => t.name === 'packer_count' && t.kind === 'counter'));
});

test('임진강김치 태그 세트는 이름 중복·group 단위 불일치가 없다', () => {
  assert.doesNotThrow(() => validateTags(IMJINGANG_TAGS));
  const regs = IMJINGANG_TAGS.map((t) => t.register);
  assert.equal(new Set(regs).size, regs.length, '레지스터 주소 중복');
});

test('PLC_TAGS_FILE 로 태그 정의를 교체할 수 있다', () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tags-')), 'tags.json');
  fs.writeFileSync(file, JSON.stringify([
    { name: 'oven_temp', label: '오븐 온도', process: '가열', group: '온도', kind: 'analog', unit: '℃', register: 40, scale: 0.1, signed: true, decimals: 1, alarm: { high: 200, hysteresis: 5 } },
  ]));
  const cfg = loadConfig({ PLC_TAGS_FILE: file });
  assert.equal(cfg.tags.length, 1);
  assert.equal(cfg.tags[0].name, 'oven_temp');
  assert.equal(cfg.tags[0].offset, 0); // 기본값 채움
});

test('잘못된 값은 기동 시 실패한다', () => {
  assert.throws(() => loadConfig({ POLL_INTERVAL_MS: 'abc' }), /환경변수 검증 실패/);
  assert.throws(() => loadConfig({ POLL_INTERVAL_MS: '500', POLL_TIMEOUT_MS: '500' }), /POLL_TIMEOUT_MS/);
  assert.throws(() => loadConfig({ PLC_DRIVER: 'opcua' }));
  assert.throws(() => validateTags([
    { name: 'a', label: 'a', process: 'p', group: 'g', kind: 'analog', unit: '℃', register: 0, scale: 1, offset: 0, signed: true, decimals: 1 },
    { name: 'b', label: 'b', process: 'p', group: 'g', kind: 'analog', unit: '%', register: 1, scale: 1, offset: 0, signed: true, decimals: 1 },
  ]), /단위가 다릅니다/);
});
