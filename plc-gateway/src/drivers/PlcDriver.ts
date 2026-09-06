/**
 * =====================================================================
 *  PLC 드라이버 인터페이스
 * =====================================================================
 *
 *  폴러(Poller)는 구체적인 통신 프로토콜을 알지 못하고 이 인터페이스만 사용합니다.
 *  따라서 Modbus TCP 외에 Siemens S7, Mitsubishi MC Protocol, OPC UA 등을
 *  추가하려면 이 인터페이스를 구현한 클래스를 drivers/ 에 추가하고
 *  drivers/index.ts 팩토리에 등록하기만 하면 됩니다.
 *
 *  계약(Contract):
 *   - connect()   : 연결 수립. 실패 시 예외. 이미 연결된 상태에서 호출해도 안전해야 함.
 *   - read()      : 모든 태그를 1회 읽어 반환. 실패 시 예외 (폴러가 BAD 품질로 기록).
 *   - disconnect(): 소켓 등 리소스 해제. 예외를 던지지 않아야 함.
 *   - isConnected : 현재 연결 상태.
 * =====================================================================
 */

import type { TagName } from '../types';

/** 1회 읽기 결과: 태그별 공학단위 값 */
export type PlcReadResult = Record<TagName, number>;

export interface PlcDriver {
  /** 드라이버 식별 이름 (health API / 로그 표시용) */
  readonly name: string;

  /** 연결 여부 */
  readonly isConnected: boolean;

  /** PLC 와 연결을 수립합니다. */
  connect(): Promise<void>;

  /** 모든 태그를 1회 읽습니다. */
  read(): Promise<PlcReadResult>;

  /** 연결을 종료하고 리소스를 정리합니다. */
  disconnect(): Promise<void>;
}
