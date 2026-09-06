/**
 * =====================================================================
 *  샘플 데이터 생성 스크립트
 * =====================================================================
 *
 *  실제 게이트웨이와 동일한 Poller + SimulatorDriver 를 사용해
 *  1초에 1개씩 N개(기본 100개)의 샘플을 생성하고 파일로 저장합니다.
 *  (setInterval 로 흉내내지 않고 실제 폴링 경로를 타므로 타임스탬프가
 *   정초에 정렬되고 seq/latency/quality 필드가 운영 데이터와 동일합니다)
 *
 *  사용법
 *    npx tsx scripts/generate-samples.ts                # 100개, public/samples/ 에 저장
 *    npx tsx scripts/generate-samples.ts --count 30     # 30개
 *    npx tsx scripts/generate-samples.ts --spike-at 60  # 60초째에 온도 스파이크(알람) 발생
 *    npx tsx scripts/generate-samples.ts --out ./data   # 출력 디렉터리 변경
 *
 *  출력 파일
 *    <out>/sample-<count>.jsonl  한 줄에 샘플 1건 (스트리밍 처리용)
 *    <out>/sample-<count>.json   { meta, tags, samples[], alarms[] } (대시보드 로딩용)
 * =====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../src/config';
import { AlarmEngine } from '../src/core/AlarmEngine';
import { Poller } from '../src/core/Poller';
import { SimulatorDriver } from '../src/drivers/SimulatorDriver';
import type { Alarm, Sample } from '../src/types';
import { createLogger, setLogLevel } from '../src/utils/logger';

const log = createLogger('gen');

/** 아주 단순한 CLI 인자 파서: --key value */
function arg(name: string, def: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main(): Promise<void> {
  const count = Number(arg('count', '100'));
  const spikeAt = Number(arg('spike-at', '60'));
  const outDir = path.resolve(arg('out', path.join(__dirname, '..', 'public', 'samples')));
  const intervalMs = Number(arg('interval', '1000'));

  const config = loadConfig({ ...process.env, POLL_INTERVAL_MS: String(intervalMs), POLL_TIMEOUT_MS: String(Math.floor(intervalMs * 0.8)) });
  setLogLevel('warn'); // 폴러 로그는 조용히, 진행 상황만 직접 출력

  const driver = new SimulatorDriver({
    tempBase: config.env.SIM_TEMP_BASE,
    pressureBase: config.env.SIM_PRESSURE_BASE,
    faultRate: config.env.SIM_FAULT_RATE,
    forceSpikeAtSec: spikeAt > 0 ? spikeAt : undefined,
  });
  const poller = new Poller(driver, {
    intervalMs,
    timeoutMs: Math.floor(intervalMs * 0.8),
    reconnectBaseMs: 1000,
    reconnectMaxMs: 5000,
  });
  const alarms = new AlarmEngine(config.tags, 100);

  const samples: Sample[] = [];
  const alarmEvents: Alarm[] = [];
  alarms.on('alarm', (a) => alarmEvents.push(a));

  const done = new Promise<void>((resolve) => {
    poller.on('sample', (s) => {
      samples.push(s);
      alarms.evaluate(s);
      process.stdout.write(
        `\r[${String(samples.length).padStart(3)}/${count}] ${s.ts}  온도 ${s.values.temperature ?? '-'} ℃  압력 ${s.values.pressure ?? '-'} bar  (${s.quality})   `,
      );
      if (samples.length >= count) resolve();
    });
  });

  const startedAt = new Date();
  await poller.start();
  await done;
  await poller.stop();
  process.stdout.write('\n');

  fs.mkdirSync(outDir, { recursive: true });
  const jsonlPath = path.join(outDir, `sample-${count}.jsonl`);
  const jsonPath = path.join(outDir, `sample-${count}.json`);

  fs.writeFileSync(jsonlPath, samples.map((s) => JSON.stringify(s)).join('\n') + '\n', 'utf8');
  fs.writeFileSync(
    jsonPath,
    JSON.stringify(
      {
        meta: {
          generatedAt: startedAt.toISOString(),
          count: samples.length,
          intervalMs,
          driver: driver.name,
          firstTs: samples[0]?.ts ?? null,
          lastTs: samples[samples.length - 1]?.ts ?? null,
        },
        tags: config.tags.map((t) => ({ name: t.name, label: t.label, unit: t.unit, decimals: t.decimals, alarm: t.alarm ?? null })),
        samples,
        alarms: alarmEvents,
      },
      null,
      2,
    ) + '\n',
    'utf8',
  );

  log.warn('샘플 생성 완료', { count: samples.length, alarms: alarmEvents.length, jsonlPath, jsonPath });
  process.exit(0);
}

main().catch((err) => {
  log.error('샘플 생성 실패', { err });
  process.exit(1);
});
