/**
 * Modbus 디코딩/읽기 계획 순수 함수 테스트 (실제 PLC 불필요)
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeRegister, planReads, toInt16 } from '../src/drivers/ModbusTcpDriver';
import type { TagDefinition } from '../src/types';

const tag = (name: 'temperature' | 'pressure', register: number): TagDefinition => ({
  name,
  label: name,
  unit: '',
  register,
  scale: 0.1,
  offset: 0,
  signed: true,
  decimals: 1,
});

test('toInt16 은 16bit 2의 보수를 올바르게 변환한다', () => {
  assert.equal(toInt16(0), 0);
  assert.equal(toInt16(0x7fff), 32767);
  assert.equal(toInt16(0x8000), -32768);
  assert.equal(toInt16(0xffff), -1);
});

test('decodeRegister 는 부호/스케일/오프셋을 적용한다', () => {
  assert.equal(decodeRegister(253, { signed: true, scale: 0.1, offset: 0 }), 25.3);
  assert.equal(decodeRegister(0xffff, { signed: true, scale: 0.1, offset: 0 }), -0.1);
  assert.equal(decodeRegister(0xffff, { signed: false, scale: 1, offset: 0 }), 65535);
  assert.equal(decodeRegister(100, { signed: true, scale: 0.01, offset: -1 }), 0);
});

test('planReads 는 인접 레지스터를 한 블록으로 묶는다', () => {
  const plan = planReads([tag('pressure', 10), tag('temperature', 0)]);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].start, 0);
  assert.equal(plan[0].length, 11);
  assert.deepEqual(plan[0].tags.map((t) => t.name), ['temperature', 'pressure']);
});

test('planReads 는 범위가 125워드를 넘으면 태그별로 분리한다', () => {
  const plan = planReads([tag('temperature', 0), tag('pressure', 500)]);
  assert.equal(plan.length, 2);
  assert.deepEqual(plan.map((b) => [b.start, b.length]), [[0, 1], [500, 1]]);
});
