/**
 * =====================================================================
 *  시뮬레이터 드라이버
 * =====================================================================
 *
 *  실제 PLC 없이 게이트웨이를 개발/시연/테스트하기 위한 가상 PLC 입니다.
 *  - 온도: 기준값(SIM_TEMP_BASE) 주위로 느린 사인파 + 랜덤 노이즈 + 이따금 스파이크
 *  - 압력: 기준값(SIM_PRESSURE_BASE) 주위로 랜덤워크 + 노이즈
 *  - SIM_FAULT_RATE(0~1) 확률로 읽기 실패를 발생시켜 재접속 로직을 검증할 수 있음
 *
 *  실제 공정 데이터처럼 보이도록 값이 연속적으로 변하게 설계했습니다.
 * =====================================================================
 */

import { createLogger } from '../utils/logger';
import type { PlcDriver, PlcReadResult } from './PlcDriver';

const log = createLogger('sim');

export interface SimulatorOptions {
  /** 온도 기준값 (℃) */
  tempBase: number;
  /** 압력 기준값 (bar) */
  pressureBase: number;
  /** 읽기 실패 확률 (0 = 실패 없음, 0.1 = 10%) */
  faultRate: number;
  /** 시뮬레이션 지연 (ms). 실제 PLC 응답 시간을 흉내냄 */
  latencyMs?: number;
  /**
   * 기동 후 이 초(秒)에 도달하면 온도 스파이크(20초간 +60℃)를 강제로 발생시킵니다.
   * 배열을 주면 여러 지점에서 발생. 알람 데모/샘플 데이터 생성용. 미설정 시 랜덤 발생만 적용.
   */
  forceSpikeAtSec?: number | number[];
}

export class SimulatorDriver implements PlcDriver {
  readonly name = 'simulator';
  private connected = false;

  /** 기동 시각 - 사인파 위상 계산용 */
  private readonly startedAt = Date.now();

  /** 압력 랜덤워크 현재 오프셋 */
  private pressureDrift = 0;

  /** 온도 스파이크 잔여 시간(초). 0 이면 스파이크 없음 */
  private spikeRemaining = 0;

  /** 읽기 호출 횟수 (forceSpikeAtSec 판정용) */
  private readCount = 0;

  constructor(private readonly opts: SimulatorOptions) {}

  get isConnected(): boolean {
    return this.connected;
  }

  async connect(): Promise<void> {
    // 실제 소켓 연결처럼 약간의 지연을 둠
    await sleep(this.opts.latencyMs ?? 20);
    this.connected = true;
    log.info('시뮬레이터 PLC 연결됨', { tempBase: this.opts.tempBase, pressureBase: this.opts.pressureBase });
  }

  async read(): Promise<PlcReadResult> {
    if (!this.connected) {
      throw new Error('시뮬레이터가 연결되지 않았습니다');
    }

    // 지연 시뮬레이션 (5~25ms 랜덤)
    await sleep(this.opts.latencyMs ?? 5 + Math.random() * 20);

    // 장애 주입: 지정 확률로 통신 오류 발생 → 폴러의 재접속 경로 검증
    if (this.opts.faultRate > 0 && Math.random() < this.opts.faultRate) {
      this.connected = false;
      throw new Error('시뮬레이션 통신 오류 (SIM_FAULT_RATE)');
    }

    const elapsedSec = (Date.now() - this.startedAt) / 1000;
    this.readCount += 1;

    // ---- 온도: 주기 5분 사인파(±3℃) + 노이즈(±0.2℃) ----
    let temperature =
      this.opts.tempBase + 3 * Math.sin((2 * Math.PI * elapsedSec) / 300) + (Math.random() - 0.5) * 0.4;

    // 약 1/600 확률(평균 10분에 1회)로 20초짜리 온도 스파이크 시작 → 알람 데모용
    if (this.spikeRemaining === 0 && Math.random() < 1 / 600) {
      this.spikeRemaining = 20;
    }
    // 강제 스파이크: 지정한 읽기 횟수(≒초)에 도달하면 시작
    const spikeAt = this.opts.forceSpikeAtSec;
    const spikeList = spikeAt === undefined ? [] : Array.isArray(spikeAt) ? spikeAt : [spikeAt];
    if (spikeList.includes(this.readCount)) {
      this.spikeRemaining = 20;
    }
    if (this.spikeRemaining > 0) {
      temperature += 60; // 기준 25℃ + 60 = 85℃ → 기본 HIGH 임계값(80) 초과
      this.spikeRemaining -= 1;
    }

    // ---- 압력: 랜덤워크(±0.5bar 범위로 제한) + 노이즈 ----
    this.pressureDrift += (Math.random() - 0.5) * 0.02;
    this.pressureDrift = Math.max(-0.5, Math.min(0.5, this.pressureDrift));
    const pressure = this.opts.pressureBase + this.pressureDrift + (Math.random() - 0.5) * 0.02;

    return {
      temperature: round(temperature, 2),
      pressure: round(pressure, 3),
    };
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
