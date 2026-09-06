/**
 * =====================================================================
 *  드라이버 팩토리
 * =====================================================================
 *
 *  설정(PLC_DRIVER)에 따라 적절한 PlcDriver 구현체를 생성합니다.
 *  새 프로토콜을 추가하면 이 switch 에 case 를 하나 추가하세요.
 * =====================================================================
 */

import type { AppConfig } from '../config';
import { ModbusTcpDriver } from './ModbusTcpDriver';
import type { PlcDriver } from './PlcDriver';
import { SimulatorDriver } from './SimulatorDriver';

export function createDriver(config: AppConfig): PlcDriver {
  const { env, tags } = config;

  switch (env.PLC_DRIVER) {
    case 'modbus-tcp':
      return new ModbusTcpDriver({
        host: env.PLC_HOST,
        port: env.PLC_PORT,
        unitId: env.PLC_UNIT_ID,
        timeoutMs: env.POLL_TIMEOUT_MS,
        registerType: env.PLC_REGISTER_TYPE,
        tags,
      });

    case 'simulator':
    default:
      return new SimulatorDriver({
        tempBase: env.SIM_TEMP_BASE,
        pressureBase: env.SIM_PRESSURE_BASE,
        faultRate: env.SIM_FAULT_RATE,
      });
  }
}

export type { PlcDriver } from './PlcDriver';
