/**
 * =====================================================================
 *  PLC Data Gateway - 공통 타입 정의
 * =====================================================================
 *
 *  게이트웨이 전체에서 공유하는 도메인 타입을 한 곳에 모아 둡니다.
 *  - 태그(Tag)   : PLC 에서 읽어오는 개별 측정 포인트 (온도, 염도, 카운터 등)
 *  - 샘플(Sample): 1회 폴링(1초 주기)으로 얻은 모든 태그 값의 스냅샷
 *  - 알람(Alarm) : 임계값 초과/미달 이벤트
 *
 *  태그는 고정 목록이 아니라 **태그 정의(TagDefinition) 배열**로 주입됩니다.
 *  기본 태그 세트는 src/tags/imjingang.ts (㈜임진강김치 김치 공장) 이며,
 *  PLC_TAGS_FILE 환경변수로 JSON 파일을 지정해 다른 현장에 맞게 바꿀 수 있습니다.
 * =====================================================================
 */

/** 태그 이름 (영문 식별자, API JSON 키로 사용) */
export type TagName = string;

/**
 * 태그 종류
 *  - analog  : 연속 측정값 (온도, 습도, 염도, 농도 등). 차트로 추이 표시
 *  - digital : ON/OFF 상태 (0/1). 금속검출 NG, 설비 가동/정지 등
 *  - counter : 누적 카운터 (포장완료 수량, 검사 수량 등). 단조 증가
 */
export type TagKind = 'analog' | 'digital' | 'counter';

/**
 * 시뮬레이터용 파라미터 (실제 PLC 연동 시 사용하지 않음)
 */
export interface TagSimulation {
  /** 기준값 (analog) / 초기값 (counter) / 기본 상태 0|1 (digital) */
  base: number;
  /** 느린 주기 변동 폭 (analog, 사인파 진폭) */
  amplitude?: number;
  /** 랜덤 노이즈 폭 (analog) */
  noise?: number;
  /** 사인파 주기 (초, analog). 기본 300 */
  periodSec?: number;
  /** 카운터 증가 간격 (초, counter). 예) 3 → 평균 3초마다 +1 */
  incrementEverySec?: number;
  /** digital: 1초당 상태 전환 확률 (예 1/300) */
  toggleProbability?: number;
  /** digital: 전환된 상태가 유지되는 시간(초) */
  holdSec?: number;
  /** 강제 스파이크(알람 데모) 시 더해지는 값 (analog). 미설정 시 스파이크 대상 아님 */
  spikeDelta?: number;
}

/**
 * 태그(측정 포인트) 정의.
 * Modbus 레지스터 주소, 스케일 변환, 알람 임계값 등 태그별 메타데이터를 담습니다.
 */
export interface TagDefinition {
  /** 내부 식별자 (영문, API JSON 키) */
  name: TagName;
  /** 화면 표시용 한글 라벨 */
  label: string;
  /** 소속 공정 (사업계획서 1.4 공정 구분) */
  process: string;
  /** 차트 묶음 이름. 같은 group 의 analog 태그는 한 차트에 함께 그려짐 (단위 동일해야 함) */
  group: string;
  /** 태그 종류 */
  kind: TagKind;
  /** 단위 (℃, %, ppm, EA 등) */
  unit: string;
  /** Modbus 레지스터 주소 (0-base). 시뮬레이터에서는 사용하지 않음 */
  register: number;
  /** 원시값 → 공학단위 배율. 예) 원시값 253, scale 0.1 → 25.3 ℃ */
  scale: number;
  /** 스케일 적용 후 더해지는 오프셋 (기본 0) */
  offset: number;
  /** 레지스터를 부호 있는 16bit 정수로 해석할지 여부 (영하 온도 = true, 카운터 = false) */
  signed: boolean;
  /** 소수점 표시 자릿수 */
  decimals: number;
  /** 알람 임계값 설정 (없으면 알람 평가 생략) */
  alarm?: AlarmThreshold;
  /** 시뮬레이터 파라미터 */
  sim?: TagSimulation;
  /** 설명 (설비명, CCP 근거 등) */
  description?: string;
}

/**
 * 알람 임계값.
 *  - high 초과 시 HIGH 알람, low 미만 시 LOW 알람이 발생합니다.
 *  - hysteresis 는 알람 해제 여유 폭입니다.
 *    예) high=5, hysteresis=1 → 5 초과 시 발생, 4 이하로 내려와야 해제.
 *    센서 노이즈로 인한 알람 깜빡임(chattering)을 방지합니다.
 *  - digital 태그는 high=0.5, hysteresis=0 으로 두면 값 1(ON) 에서 발생, 0 에서 해제됩니다.
 */
export interface AlarmThreshold {
  high?: number;
  low?: number;
  hysteresis: number;
}

/** 데이터 품질 코드. GOOD: 정상 수집 / BAD: 통신 실패·타임아웃 (values 는 null) */
export type Quality = 'GOOD' | 'BAD';

/** 태그별 측정값 맵. 통신 실패 시 null. */
export type TagValues = Record<TagName, number | null>;

/** 1회 폴링 결과 스냅샷. 1초에 하나씩 생성되며 링버퍼/싱크/WebSocket 으로 전파됩니다. */
export interface Sample {
  /** 게이트웨이 기동 이후 단조 증가하는 일련번호 */
  seq: number;
  /** 수집 시각 (ISO-8601, UTC) */
  ts: string;
  /** 수집 시각 (epoch milliseconds) */
  epochMs: number;
  /** 태그별 값 */
  values: TagValues;
  /** 데이터 품질 */
  quality: Quality;
  /** PLC 요청~응답까지 걸린 시간 (ms) */
  latencyMs: number;
  /** 품질이 BAD 일 때의 원인 메시지 */
  error?: string;
}

export type AlarmLevel = 'HIGH' | 'LOW';
export type AlarmState = 'ACTIVE' | 'CLEARED';

/** 알람 이벤트 (발생/해제 모두 동일 구조) */
export interface Alarm {
  id: string;
  tag: TagName;
  level: AlarmLevel;
  state: AlarmState;
  value: number;
  threshold: number;
  raisedAt: string;
  clearedAt?: string;
}

/** 태그별 통계 (지정 시간 창 기준) */
export interface TagStats {
  count: number;
  min: number | null;
  max: number | null;
  avg: number | null;
  last: number | null;
}

/**
 * 데이터 싱크(Sink) 인터페이스.
 * 샘플을 외부(파일, 상위 서버 등)로 내보내는 출력 채널. 싱크 오류는 폴링을 중단시키지 않습니다.
 */
export interface Sink {
  readonly name: string;
  write(sample: Sample): void | Promise<void>;
  close?(): void | Promise<void>;
}

/** API/WS 로 내보내는 태그 공개 정보 (레지스터 등 내부 정보 제외 가능) */
export function publicTag(t: TagDefinition, includeRegister = false) {
  return {
    name: t.name,
    label: t.label,
    process: t.process,
    group: t.group,
    kind: t.kind,
    unit: t.unit,
    decimals: t.decimals,
    alarm: t.alarm ?? null,
    description: t.description ?? null,
    ...(includeRegister ? { register: t.register, scale: t.scale, offset: t.offset, signed: t.signed } : {}),
  };
}
