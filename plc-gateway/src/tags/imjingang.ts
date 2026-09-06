/**
 * =====================================================================
 *  ㈜임진강김치 기본 태그 세트
 * =====================================================================
 *
 *  2026 정부일반형 스마트공장 사업계획서(㈜임진강김치 / 로뎀솔루션) 의
 *  4.3 H/W 구입 내역 및 2.5 데이터 집계 포인트를 기준으로 정의한 PLC 수집 항목입니다.
 *
 *  현장 설비 → PLC Control Panel(Master/Slave, LS산전 XBC-DN32H) → Ethernet(XBL-EMTA)
 *   - 온습도센서(THD-WD1-T, RS-485) 10식 : 창고·작업장 온도/습도
 *   - 온도조절기(FOX-2003CC, RS-485) 4식 : 숙성고·냉장창고·냉동고 온도
 *   - 염도센서 2식                      : 염수탱크 염도
 *   - 소독수 Interface Module           : 소독수 농도(ppm)
 *   - 금속검출기                        : 검출 결과(OK/NG), 검사/불합격 수량
 *   - 아이스박스 자동포장기(KF 100)     : 가동/정지, 포장완료 수량
 *
 *  레지스터 주소는 PLC 프로그램 확정 전 임시값(0부터 순차)입니다.
 *  실제 주소·스케일은 PLC_TAGS_FILE(JSON) 로 덮어쓰거나 이 파일을 수정하세요.
 *
 *  알람 기준(LOW/HIGH)은 임진강김치 MES 의 CCP 기준을 참고했습니다.
 *   - 세척수 온도 CCP 1~15 ℃, 절임 염수 염도 10±1 %, 냉장 보관 -3~5 ℃, 냉동 -25~-15 ℃
 *   - 최종 기준값은 HACCP 기준서 및 시운전 결과로 확정합니다.
 * =====================================================================
 */

import type { TagDefinition } from '../types';

/** 냉장·냉동 온도 태그 공통 값 */
const coldTemp = (name: string, label: string, process: string, register: number, description: string): TagDefinition => ({
  name, label, process, register, description,
  group: '냉장·냉동 온도', kind: 'analog', unit: '℃', scale: 0.1, offset: 0, signed: true, decimals: 1,
  alarm: { low: -3, high: 5, hysteresis: 1 },
  sim: { base: 1.5, amplitude: 1.0, noise: 0.3, periodSec: 600 },
});

export const IMJINGANG_TAGS: TagDefinition[] = [
  // ---- 온도조절기(FOX-2003CC) 4식: 숙성고 / 원재료 냉장창고 / 완제품 냉장창고 / 냉동고 ----
  { ...coldTemp('aging_room_temp', '숙성고 온도', '숙성발효', 0, '숙성 냉장고 온도조절기(FOX-2003CC #1). 발효 품질 관리'), sim: { base: 1.5, amplitude: 1.0, noise: 0.3, periodSec: 600, spikeDelta: 9 } },
  coldTemp('raw_cold_temp', '원재료 냉장창고 온도', '입고/보관', 1, '냉장 원재료 창고(WH-002) 온도조절기 #2'),
  coldTemp('product_cold_temp', '완제품 냉장창고 온도', '포장/출고', 2, '완제품 냉장창고(WH-003) 온도조절기 #3'),
  {
    name: 'freezer_temp', label: '냉동고 온도', process: '입고/보관', group: '냉장·냉동 온도', kind: 'analog', unit: '℃',
    register: 3, scale: 0.1, offset: 0, signed: true, decimals: 1,
    alarm: { low: -25, high: -15, hysteresis: 1 },
    sim: { base: -20, amplitude: 1.5, noise: 0.3, periodSec: 900 },
    description: '냉동고 온도조절기 #4',
  },

  // ---- 온습도센서(THD-WD1-T) : 전처리실(대표 1식) ----
  {
    name: 'prep_room_temp', label: '전처리실 온도', process: '절단/전처리', group: '작업장 온도', kind: 'analog', unit: '℃',
    register: 4, scale: 0.1, offset: 0, signed: true, decimals: 1,
    alarm: { low: 5, high: 25, hysteresis: 2 },
    sim: { base: 16, amplitude: 3, noise: 0.3, periodSec: 1800 },
    description: '전처리실 온습도센서(THD-WD1-T) 온도. 작업장 위생 환경 관리',
  },
  {
    name: 'prep_room_humidity', label: '전처리실 습도', process: '절단/전처리', group: '작업장 습도', kind: 'analog', unit: '%',
    register: 5, scale: 0.1, offset: 0, signed: false, decimals: 1,
    alarm: { high: 85, hysteresis: 3 },
    sim: { base: 70, amplitude: 6, noise: 0.8, periodSec: 1800 },
    description: '전처리실 온습도센서(THD-WD1-T) 상대습도',
  },

  // ---- 염도센서 2식 : 염수탱크 ----
  {
    name: 'brine_tank1_salinity', label: '염수탱크 1호 염도', process: '세척/절임', group: '염수 염도', kind: 'analog', unit: '%',
    register: 6, scale: 0.01, offset: 0, signed: false, decimals: 2,
    alarm: { low: 9, high: 11, hysteresis: 0.3 },
    sim: { base: 10.0, amplitude: 0.4, noise: 0.05, periodSec: 1200 },
    description: '절임 염수탱크 1호 염도센서. 절임 CCP 기준 10±1 %',
  },
  {
    name: 'brine_tank2_salinity', label: '염수탱크 2호 염도', process: '세척/절임', group: '염수 염도', kind: 'analog', unit: '%',
    register: 7, scale: 0.01, offset: 0, signed: false, decimals: 2,
    alarm: { low: 9, high: 11, hysteresis: 0.3 },
    sim: { base: 10.2, amplitude: 0.4, noise: 0.05, periodSec: 1500 },
    description: '절임 염수탱크 2호 염도센서. 절임 CCP 기준 10±1 %',
  },

  // ---- 소독수 Interface Module ----
  {
    name: 'sanitizer_ppm', label: '소독수 농도', process: '세척/절임', group: '소독수 농도', kind: 'analog', unit: 'ppm',
    register: 8, scale: 0.1, offset: 0, signed: false, decimals: 1,
    alarm: { low: 8, high: 15, hysteresis: 1 },
    sim: { base: 10.5, amplitude: 1.5, noise: 0.2, periodSec: 900 },
    description: '소독수 공급장치 Interface Module(XBL-EMTA). 유효염소 농도',
  },

  // ---- 세척수 온도 (온습도센서 활용) ----
  {
    name: 'wash_water_temp', label: '세척수 온도', process: '세척/절임', group: '세척수 온도', kind: 'analog', unit: '℃',
    register: 9, scale: 0.1, offset: 0, signed: true, decimals: 1,
    alarm: { low: 1, high: 15, hysteresis: 1 },
    sim: { base: 8, amplitude: 3, noise: 0.3, periodSec: 1200 },
    description: '세척수 온도. 세척 CCP-W1 기준 1~15 ℃',
  },

  // ---- 금속검출기 ----
  {
    name: 'metal_detector_ng', label: '금속검출 NG', process: '금속검출', group: '금속검출', kind: 'digital', unit: 'ON/OFF',
    register: 10, scale: 1, offset: 0, signed: false, decimals: 0,
    alarm: { high: 0.5, hysteresis: 0 },
    sim: { base: 0, toggleProbability: 1 / 240, holdSec: 3 },
    description: '금속검출기 불합격 신호(1=NG). 발생 즉시 알람',
  },
  {
    name: 'metal_inspected_count', label: '금속검출 검사수량', process: '금속검출', group: '검사·포장 수량', kind: 'counter', unit: 'EA',
    register: 11, scale: 1, offset: 0, signed: false, decimals: 0,
    sim: { base: 0, incrementEverySec: 2 },
    description: '금속검출기 검사 통과 누적 수량 카운터',
  },
  {
    name: 'metal_rejected_count', label: '금속검출 불합격수량', process: '금속검출', group: '검사·포장 수량', kind: 'counter', unit: 'EA',
    register: 12, scale: 1, offset: 0, signed: false, decimals: 0,
    sim: { base: 0 },
    description: '금속검출기 불합격 누적 수량 카운터 (NG 신호 시 +1)',
  },

  // ---- 아이스박스 자동포장기(KF 100) ----
  {
    name: 'packer_running', label: '자동포장기 가동', process: '포장/출고', group: '자동포장기', kind: 'digital', unit: 'ON/OFF',
    register: 13, scale: 1, offset: 0, signed: false, decimals: 0,
    sim: { base: 1, toggleProbability: 1 / 200, holdSec: 30 },
    description: '아이스박스 자동포장기 가동(1)/정지(0) 상태',
  },
  {
    name: 'packer_count', label: '포장완료 수량', process: '포장/출고', group: '검사·포장 수량', kind: 'counter', unit: 'EA',
    register: 14, scale: 1, offset: 0, signed: false, decimals: 0,
    sim: { base: 0, incrementEverySec: 3 },
    description: '아이스박스 자동포장기 포장완료 누적 수량. 시간당 생산량 KPI 산출 근거',
  },
];
