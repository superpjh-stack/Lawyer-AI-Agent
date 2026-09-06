/**
 * =====================================================================
 *  시뮬레이터 드라이버 (태그 정의 기반)
 * =====================================================================
 *
 *  실제 PLC 없이 게이트웨이를 개발/시연/테스트하기 위한 가상 PLC 입니다.
 *  태그 정의의 sim 파라미터에 따라 종류별로 값을 생성합니다.
 *
 *   - analog  : base + amplitude×sin(주기) + 노이즈. spikeDelta 가 있는 태그는
 *               지정 시점(forceSpikeAtSec)에 20초간 값이 튀어 알람 데모가 됩니다.
 *   - digital : base 상태를 유지하다 toggleProbability 확률로 반대 상태로 전환,
 *               holdSec 동안 유지 후 복귀. (예: 금속검출 NG 3초, 포장기 정지 30초)
 *   - counter : incrementEverySec 마다 평균 1씩 증가하는 누적 카운터.
 *               특수 연동: packer_count 는 packer_running=1 일 때만 증가,
 *               metal_rejected_count 는 metal_detector_ng 가 1이 되는 순간 +1.
 *
 *  SIM_FAULT_RATE(0~1) 확률로 읽기 실패를 발생시켜 재접속 로직을 검증할 수 있습니다.
 * =====================================================================
 */

import type { TagDefinition } from '../types';
import { createLogger } from '../utils/logger';
import type { PlcDriver, PlcReadResult } from './PlcDriver';

const log = createLogger('sim');

export interface SimulatorOptions {
  tags: TagDefinition[];
  /** 읽기 실패 확률 (0 = 실패 없음, 0.1 = 10%) */
  faultRate: number;
  /** 시뮬레이션 지연 (ms). 실제 PLC 응답 시간을 흉내냄 */
  latencyMs?: number;
  /**
   * 기동 후 이 읽기 횟수(≒초)에 도달하면 spikeDelta 가 정의된 analog 태그에
   * 20초간 스파이크를 강제로 발생시킵니다. 배열이면 여러 지점. 알람 데모/샘플 생성용.
   */
  forceSpikeAtSec?: number | number[];
}

/** 태그별 런타임 상태 */
interface TagState {
  /** digital: 현재 상태 / counter: 현재 누적값 / analog: 사용 안 함 */
  value: number;
  /** digital: 전환 상태 잔여 유지 시간(초) */
  holdRemaining: number;
  /** counter: 다음 증가까지 남은 시간(초, 소수) */
  nextIncrementIn: number;
  /** analog: 스파이크 잔여 시간(초) */
  spikeRemaining: number;
}

export class SimulatorDriver implements PlcDriver {
  readonly name = 'simulator';
  private connected = false;
  private readonly startedAt = Date.now();
  private readCount = 0;
  private readonly state = new Map<string, TagState>();

  constructor(private readonly opts: SimulatorOptions) {
    for (const t of opts.tags) {
      const s = t.sim ?? { base: 0 };
      this.state.set(t.name, {
        value: s.base,
        holdRemaining: 0,
        nextIncrementIn: s.incrementEverySec ?? 0,
        spikeRemaining: 0,
      });
    }
  }

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    await sleep(this.opts.latencyMs ?? 20);
    this.connected = true;
    log.info('시뮬레이터 PLC 연결됨', { tags: this.opts.tags.length });
  }

  async read(): Promise<PlcReadResult> {
    if (!this.connected) throw new Error('시뮬레이터가 연결되지 않았습니다');

    // 지연 시뮬레이션 (5~25ms 랜덤)
    await sleep(this.opts.latencyMs ?? 5 + Math.random() * 20);

    // 장애 주입
    if (this.opts.faultRate > 0 && Math.random() < this.opts.faultRate) {
      this.connected = false;
      throw new Error('시뮬레이션 통신 오류 (SIM_FAULT_RATE)');
    }

    this.readCount += 1;
    const elapsedSec = (Date.now() - this.startedAt) / 1000;
    const spikeAt = this.opts.forceSpikeAtSec;
    const spikeList = spikeAt === undefined ? [] : Array.isArray(spikeAt) ? spikeAt : [spikeAt];
    const spikeNow = spikeList.includes(this.readCount);

    const result: PlcReadResult = {};

    // 1) digital 태그 먼저 계산 (counter 연동에 필요)
    for (const t of this.opts.tags) {
      if (t.kind !== 'digital') continue;
      const s = t.sim ?? { base: 0 };
      const st = this.state.get(t.name)!;
      if (st.holdRemaining > 0) {
        st.holdRemaining -= 1;
        if (st.holdRemaining === 0) st.value = s.base; // 유지 시간 종료 → 기본 상태 복귀
      } else if (s.toggleProbability && Math.random() < s.toggleProbability) {
        st.value = s.base === 1 ? 0 : 1;
        st.holdRemaining = Math.max(1, s.holdSec ?? 1);
      }
      result[t.name] = st.value;
    }

    // 2) analog / counter
    for (const t of this.opts.tags) {
      const s = t.sim ?? { base: 0 };
      const st = this.state.get(t.name)!;

      if (t.kind === 'analog') {
        const period = s.periodSec ?? 300;
        let v = s.base + (s.amplitude ?? 0) * Math.sin((2 * Math.PI * elapsedSec) / period) + (Math.random() - 0.5) * (s.noise ?? 0) * 2;
        if (spikeNow && s.spikeDelta !== undefined) st.spikeRemaining = 20;
        if (st.spikeRemaining > 0) {
          v += s.spikeDelta ?? 0;
          st.spikeRemaining -= 1;
        }
        result[t.name] = round(v, t.decimals + 1);
      } else if (t.kind === 'counter') {
        // 특수 연동 규칙
        if (t.name === 'metal_rejected_count') {
          const ng = result['metal_detector_ng'];
          const prevNg = this.state.get('metal_detector_ng')?.holdRemaining;
          // NG 신호가 막 켜진 순간(hold 가 최대치)에만 +1
          if (ng === 1 && prevNg !== undefined && prevNg === Math.max(1, (this.opts.tags.find((x) => x.name === 'metal_detector_ng')?.sim?.holdSec ?? 1))) {
            st.value += 1;
          }
        } else if (s.incrementEverySec) {
          const running = t.name === 'packer_count' ? (result['packer_running'] ?? 1) === 1 : true;
          if (running) {
            st.nextIncrementIn -= 1;
            if (st.nextIncrementIn <= 0) {
              st.value += 1;
              // 평균 incrementEverySec, ±30% 지터
              st.nextIncrementIn = s.incrementEverySec * (0.7 + Math.random() * 0.6);
            }
          }
        }
        result[t.name] = st.value;
      }
    }

    return result;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    log.info('시뮬레이터 PLC 연결 해제');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
function round(v: number, decimals: number): number {
  const f = 10 ** decimals;
  return Math.round(v * f) / f;
}
