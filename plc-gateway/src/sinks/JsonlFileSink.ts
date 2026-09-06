/**
 * =====================================================================
 *  JSONL 파일 싱크
 * =====================================================================
 *
 *  샘플을 하루 단위 파일(data/plc-YYYY-MM-DD.jsonl)에 한 줄씩 JSON 으로 기록합니다.
 *  - 1초마다 디스크 I/O 를 하지 않도록 메모리 버퍼에 모았다가 SINK_JSONL_FLUSH_MS
 *    주기(기본 2초) 또는 종료 시점에 일괄 append 합니다.
 *  - 쓰기 실패는 로그만 남기고 폴링 루프에 영향을 주지 않습니다.
 *  - JSONL 은 한 줄이 곧 레코드이므로 파일이 크더라도 스트리밍으로 쉽게 재처리할 수 있습니다.
 *    (예: `jq -c 'select(.quality=="GOOD")' data/plc-2026-09-06.jsonl`)
 * =====================================================================
 */

import fs from 'node:fs';
import path from 'node:path';
import type { Sample, Sink } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('sink:jsonl');

export interface JsonlFileSinkOptions {
  dir: string;
  flushIntervalMs: number;
}

export class JsonlFileSink implements Sink {
  readonly name = 'jsonl-file';
  private buffer: string[] = [];
  private timer: NodeJS.Timeout | null;

  constructor(private readonly opts: JsonlFileSinkOptions) {
    fs.mkdirSync(opts.dir, { recursive: true });
    this.timer = setInterval(() => void this.flush(), opts.flushIntervalMs);
    // 타이머 때문에 프로세스 종료가 막히지 않도록 unref
    this.timer.unref();
    log.info('JSONL 파일 싱크 활성화', { dir: path.resolve(opts.dir), flushIntervalMs: opts.flushIntervalMs });
  }

  write(sample: Sample): void {
    this.buffer.push(JSON.stringify(sample));
  }

  /**
   * 버퍼를 날짜별 파일로 나누어 append 합니다.
   * 자정을 넘기는 순간의 샘플도 각자 올바른 날짜 파일에 들어갑니다.
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;
    const lines = this.buffer;
    this.buffer = [];

    // 날짜(UTC 기준 YYYY-MM-DD)별로 그룹핑
    const byDate = new Map<string, string[]>();
    for (const line of lines) {
      // ts 필드를 파싱하지 않고 문자열에서 날짜 부분만 추출 (성능)
      const m = /"ts":"(\d{4}-\d{2}-\d{2})/.exec(line);
      const date = m ? m[1] : new Date().toISOString().slice(0, 10);
      const arr = byDate.get(date) ?? [];
      arr.push(line);
      byDate.set(date, arr);
    }

    for (const [date, group] of byDate) {
      const file = path.join(this.opts.dir, `plc-${date}.jsonl`);
      try {
        await fs.promises.appendFile(file, group.join('\n') + '\n', 'utf8');
      } catch (err) {
        log.error('JSONL 파일 쓰기 실패', { file, err });
      }
    }
  }

  async close(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    await this.flush();
    log.info('JSONL 파일 싱크 종료');
  }
}
