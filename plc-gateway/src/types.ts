/**
 * =====================================================================
 *  PLC Data Gateway - 공통 타입 정의
 * =====================================================================
 *
 *  게이트웨이 전체에서 공유하는 도메인 타입을 한 곳에 모아 둡니다.
 *  - 태그(Tag)   : PLC 에서 읽어오는 개별 측정 포인트 (온도, 압력)
 *  - 샘플(Sample): 1회 폴링(1초 주기)으로 얻은 모든 태그 값의 스냅샷
 *  - 알람(Alarm) : 임계값 초과/미달 이벤트
 *
 *  새로운 태그(예: 유량, 진동)를 추가하려면
 *    1) TagName 유니온에 이름 추가
 *    2) config.ts 의 TAGS 배열에 TagDefinition 추가
 *  두 단계만 수행하면 폴러/저장소/알람/API 가 자동으로 확장됩니다.
 * =====================================================================
 */

/** PLC 에서 수집하는 태그 이름. 현재는 온도/압력 2종. */
export type TagName = 'temperature' | 'pressure';

/** 모든 태그 이름 목록 (반복 처리용 상수). */
export const TAG_NAMES: readonly TagName[] = ['temperature', 'pressure'] as const;

/**
 * 태그(측정 포인트) 정의.
 * Modbus 레지스터 주소, 스케일 변환, 알람 임계값 등 태그별 메타데이터를 담습니다.
 */
export interface TagDefinition {
  /** 내부 식별자 (API JSON 키로 그대로 사용) */
  name: TagName;
  /** 화면 표시용 한글 라벨 */
  label: string;
  /** 단위 (℃, bar 등) */
  unit: string;
  /**
   * Modbus 레지스터 주소 (0-base).
   * 시뮬레이터 드라이버에서는 사용하지 않습니다.
   */
  register: number;
  /**
   * 레지스터 원시값(정수)을 실수 공학단위로 바꾸는 배율.
   * 예) 원시값 253, scale 0.1 → 25.3 ℃
   */
  scale: number;
  /** 스케일 적용 후 더해지는 오프셋 (기본 0) */
  offset: number;
  /** 레지스터를 부호 있는 16bit 정수로 해석할지 여부 */
  signed: boolean;
  /** 소수점 표시 자릿수 (API 응답 반올림에 사용) */
  decimals: number;
  /** 알람 임계값 설정 (없으면 알람 평가 생략) */
  alarm?: AlarmThreshold;
}

/**
 * 알람 임계값.
 *  - high 초과 시 HIGH 알람, low 미만 시 LOW 알람이 발생합니다.
 *  - hysteresis 는 알람 해제 여유 폭입니다.
 *    예) high=80, hysteresis=2 → 80 초과 시 발생, 78 이하로 내려와야 해제.
 *    센서 노이즈로 인한 알람 깜빡임(chattering)을 방지합니다.
 */
export interface AlarmThreshold {
  high?: number;
  low?: number;
  hysteresis: number;
}

/**
 * 데이터 품질 코드 (OPC UA 의 Quality 개념을 단순화).
 *  - GOOD : 정상 수집
 *  - BAD  : 통신 실패/타임아웃 등으로 값이 유효하지 않음 (values 는 null)
 */
export type Quality = 'GOOD' | 'BAD';

/** 태그별 측정값 맵. 통신 실패 시 null. */
export type TagValues = Record<TagName, number | null>;

/**
 * 1회 폴링 결과 스냅샷.
 * 1초에 하나씩 생성되며 링버퍼/싱크/WebSocket 으로 전파됩니다.
 */
export interface Sample {
  /** 게이트웨이 기동 이후 단조 증가하는 일련번호 */
  seq: number;
  /** 수집 시각 (ISO-8601, UTC) */
  ts: string;
  /** 수집 시각 (epoch milliseconds) - 정렬/필터용 */
  epochMs: number;
  /** 태그별 값 */
  values: TagValues;
  /** 데이터 품질 */
  quality: Quality;
  /** PLC 요청~응답까지 걸린 시간 (ms). 통신 지연 모니터링용 */
  latencyMs: number;
  /** 품질이 BAD 일 때의 원인 메시지 */
  error?: string;
}

/** 알람 종류 */
export type AlarmLevel = 'HIGH' | 'LOW';

/** 알람 상태 */
export type AlarmState = 'ACTIVE' | 'CLEARED';

/** 알람 이벤트 (발생/해제 모두 동일 구조) */
export interface Alarm {
  /** 알람 고유 ID (발생 시 부여, 해제 시 동일 ID 유지) */
  id: string;
  tag: TagName;
  level: AlarmLevel;
  state: AlarmState;
  /** 발생/해제 시점의 측정값 */
  value: number;
  /** 위반한 임계값 */
  threshold: number;
  /** 발생 시각 (ISO) */
  raisedAt: string;
  /** 해제 시각 (ISO) - CLEARED 상태에서만 존재 */
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
 * 샘플을 외부(파일, 상위 서버, MQTT 등)로 내보내는 출력 채널입니다.
 * 싱크의 오류는 폴링 루프를 절대 중단시키지 않아야 합니다.
 */
export interface Sink {
  /** 로그/상태 표시용 이름 */
  readonly name: string;
  /** 샘플 1건 처리 (내부에서 버퍼링 가능) */
  write(sample: Sample): void | Promise<void>;
  /** 종료 시 버퍼 플러시 및 리소스 정리 */
  close?(): void | Promise<void>;
}
