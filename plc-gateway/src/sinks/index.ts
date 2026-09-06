/**
 * =====================================================================
 *  싱크 팩토리
 * =====================================================================
 *  설정에 따라 활성화된 싱크 목록을 생성합니다.
 * =====================================================================
 */

import type { AppConfig } from '../config';
import type { Sink } from '../types';
import { HttpForwardSink } from './HttpForwardSink';
import { JsonlFileSink } from './JsonlFileSink';

export function createSinks(config: AppConfig): Sink[] {
  const { env } = config;
  const sinks: Sink[] = [];

  if (env.SINK_JSONL_ENABLED) {
    sinks.push(new JsonlFileSink({ dir: env.SINK_JSONL_DIR, flushIntervalMs: env.SINK_JSONL_FLUSH_MS }));
  }

  if (env.SINK_HTTP_URL) {
    sinks.push(
      new HttpForwardSink({
        url: env.SINK_HTTP_URL,
        token: env.SINK_HTTP_TOKEN,
        batchSize: env.SINK_HTTP_BATCH_SIZE,
        flushIntervalMs: env.SINK_HTTP_FLUSH_MS,
        maxBuffer: env.SINK_HTTP_MAX_BUFFER,
      }),
    );
  }

  return sinks;
}
