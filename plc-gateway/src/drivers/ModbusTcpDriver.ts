/**
 * =====================================================================
 *  Modbus TCP 드라이버
 * =====================================================================
 *
 *  대부분의 산업용 PLC(LS산전 XGT, Siemens, Schneider, Delta 등)가 지원하는
 *  Modbus TCP 프로토콜로 레지스터를 읽습니다.
 *
 *  동작 방식
 *   1. 태그들의 레지스터 주소 범위를 계산해 가능한 한 **한 번의 요청**으로 읽습니다.
 *      (주소 범위가 125워드 이내면 1회, 아니면 태그별로 개별 읽기)
 *      → 1초 주기 안에 왕복 횟수를 최소화해 지연을 줄입니다.
 *   2. 원시 16bit 정수를 부호/스케일/오프셋 규칙에 따라 공학단위로 변환합니다.
 *      value = toSigned(raw) * scale + offset
 *
 *  레지스터 종류
 *   - holding (FC03, 4xxxx 영역) : 읽기/쓰기 레지스터. 가장 일반적.
 *   - input   (FC04, 3xxxx 영역) : 읽기 전용 아날로그 입력.
 *
 *  32bit(float/int32) 값이 필요한 경우 decodeRegisters() 를 확장하면 됩니다.
 * =====================================================================
 */

import ModbusRTU from 'modbus-serial';
import type { TagDefinition, TagName } from '../types';
import { createLogger } from '../utils/logger';
import type { PlcDriver, PlcReadResult } from './PlcDriver';

const log = createLogger('modbus');

/** Modbus 규격상 1회 요청으로 읽을 수 있는 최대 레지스터 수 */
const MAX_REGISTERS_PER_REQUEST = 125;

export interface ModbusTcpOptions {
  host: string;
  port: number;
  unitId: number;
  /** 요청 타임아웃 (ms) - 폴링 주기보다 짧아야 함 */
  timeoutMs: number;
  registerType: 'holding' | 'input';
  tags: TagDefinition[];
}

/**
 * 16bit 부호 없는 정수를 부호 있는 정수로 변환.
 * 예) 65535 → -1, 32768 → -32768
 */
export function toInt16(raw: number): number {
  return raw > 0x7fff ? raw - 0x10000 : raw;
}

/**
 * 원시 레지스터 값을 공학단위 값으로 변환.
 * 테스트 용이성을 위해 순수 함수로 분리.
 */
export function decodeRegister(raw: number, tag: Pick<TagDefinition, 'signed' | 'scale' | 'offset'>): number {
  const n = tag.signed ? toInt16(raw) : raw;
  return n * tag.scale + tag.offset;
}

/**
 * 태그 목록으로부터 읽기 계획(주소 블록)을 계산.
 * 모든 태그가 125워드 범위 안에 있으면 하나의 블록으로 묶습니다.
 */
export function planReads(tags: TagDefinition[]): Array<{ start: number; length: number; tags: TagDefinition[] }> {
  if (tags.length === 0) return [];
  const sorted = [...tags].sort((a, b) => a.register - b.register);
  const start = sorted[0].register;
  const end = sorted[sorted.length - 1].register;
  const span = end - start + 1;

  if (span <= MAX_REGISTERS_PER_REQUEST) {
    return [{ start, length: span, tags: sorted }];
  }
  // 범위가 넓으면 태그별 개별 읽기
  return sorted.map((t) => ({ start: t.register, length: 1, tags: [t] }));
}

export class ModbusTcpDriver implements PlcDriver {
  readonly name = 'modbus-tcp';
  private client = new ModbusRTU();
  private connected = false;
  private readonly plan: ReturnType<typeof planReads>;

  constructor(private readonly opts: ModbusTcpOptions) {
    this.plan = planReads(opts.tags);
    log.debug('읽기 계획 수립', {
      blocks: this.plan.map((b) => ({ start: b.start, length: b.length, tags: b.tags.map((t) => t.name) })),
    });
  }

  get isConnected(): boolean {
    return this.connected && this.client.isOpen;
  }

  async connect(): Promise<void> {
    if (this.isConnected) return;

    // 이전 소켓이 반쯤 열려 있을 수 있으므로 새 클라이언트로 교체
    if (this.client.isOpen) {
      await this.safeClose();
    }
    this.client = new ModbusRTU();
    this.client.setID(this.opts.unitId);
    this.client.setTimeout(this.opts.timeoutMs);

    await this.client.connectTCP(this.opts.host, { port: this.opts.port });
    this.connected = true;
    log.info('Modbus TCP 연결됨', { host: this.opts.host, port: this.opts.port, unitId: this.opts.unitId });
  }

  async read(): Promise<PlcReadResult> {
    if (!this.isConnected) {
      throw new Error('Modbus 연결이 열려있지 않습니다');
    }

    const result: Partial<Record<TagName, number>> = {};

    for (const block of this.plan) {
      // 레지스터 종류에 따라 FC03/FC04 선택
      const res =
        this.opts.registerType === 'input'
          ? await this.client.readInputRegisters(block.start, block.length)
          : await this.client.readHoldingRegisters(block.start, block.length);

      for (const tag of block.tags) {
        const raw = res.data[tag.register - block.start];
        if (raw === undefined) {
          throw new Error(`레지스터 ${tag.register} 응답 누락 (tag=${tag.name})`);
        }
        result[tag.name] = decodeRegister(raw, tag);
      }
    }

    return result as PlcReadResult;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    await this.safeClose();
    log.info('Modbus TCP 연결 해제');
  }

  /** close() 콜백 기반 API 를 Promise 로 감싸고, 예외를 삼킵니다. */
  private safeClose(): Promise<void> {
    return new Promise((resolve) => {
      try {
        this.client.close(() => resolve());
      } catch {
        resolve();
      }
    });
  }
}
