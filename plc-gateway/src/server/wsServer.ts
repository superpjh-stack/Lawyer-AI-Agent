/**
 * =====================================================================
 *  WebSocket 서버 - 실시간 푸시
 * =====================================================================
 *
 *  경로: ws://host:port/ws  (GATEWAY_API_KEY 설정 시 ?apiKey= 필요)
 *
 *  서버 → 클라이언트 메시지 (모두 JSON)
 *   { type: 'snapshot', latest: Sample|null, activeAlarms: Alarm[], tags: [...] }  접속 직후 1회
 *   { type: 'sample',   sample: Sample }                                          매 초
 *   { type: 'alarm',    alarm: Alarm }                                            발생/해제 시
 *   { type: 'plc',      connected: boolean, reason?: string }                     연결 상태 변화 시
 *
 *  하트비트
 *   30초마다 ping 을 보내고 pong 이 없으면 좀비 연결로 판단해 종료합니다.
 *   (NAT/프록시 뒤에서 조용히 끊긴 소켓이 쌓이는 것을 방지)
 * =====================================================================
 */

import type http from 'node:http';
import { WebSocket, WebSocketServer } from 'ws';
import type { AppConfig } from '../config';
import type { AlarmEngine } from '../core/AlarmEngine';
import type { DataStore } from '../core/DataStore';
import type { Poller } from '../core/Poller';
import { publicTag } from '../types';
import { createLogger } from '../utils/logger';

const log = createLogger('ws');

const HEARTBEAT_MS = 30_000;

export interface WsServerDeps {
  server: http.Server;
  config: AppConfig;
  poller: Poller;
  store: DataStore;
  alarms: AlarmEngine;
}

/** ws.WebSocket 에 alive 플래그를 얹은 타입 */
type LiveSocket = WebSocket & { isAlive?: boolean };

export function createWsServer(deps: WsServerDeps): WebSocketServer {
  const { server, config, poller, store, alarms } = deps;
  const apiKey = config.env.GATEWAY_API_KEY;

  const wss = new WebSocketServer({ noServer: true });

  // ---- HTTP Upgrade 핸들링: 경로/인증 검사 후 WebSocket 으로 승격 ----
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (url.pathname !== '/ws') {
      socket.destroy();
      return;
    }
    if (apiKey && url.searchParams.get('apiKey') !== apiKey) {
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  });

  /** 모든 접속 클라이언트에 브로드캐스트 */
  const broadcast = (payload: unknown): void => {
    if (wss.clients.size === 0) return;
    const data = JSON.stringify(payload);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data, (err) => {
          if (err) log.debug('전송 실패', { err });
        });
      }
    }
  };

  // ---- 접속 처리 ----
  wss.on('connection', (ws: LiveSocket, req) => {
    ws.isAlive = true;
    ws.on('pong', () => (ws.isAlive = true));
    ws.on('error', (err) => log.debug('소켓 오류', { err }));

    log.info('WS 클라이언트 접속', { remote: req.socket.remoteAddress, clients: wss.clients.size });

    // 접속 직후 현재 상태 스냅샷 전송 (화면 초기 렌더링용)
    ws.send(
      JSON.stringify({
        type: 'snapshot',
        latest: store.getLatest(),
        activeAlarms: alarms.getActive(),
        plcConnected: poller.getStats().connected,
        tags: config.tags.map((t) => publicTag(t)),
        // 최근 5분 이력을 함께 보내 차트가 즉시 채워지도록 함
        history: store.getHistory({ limit: 300 }),
      }),
    );

    ws.on('close', () => log.info('WS 클라이언트 종료', { clients: wss.clients.size }));
  });

  // ---- 폴러/알람 이벤트를 브로드캐스트에 연결 ----
  poller.on('sample', (sample) => broadcast({ type: 'sample', sample }));
  poller.on('connected', () => broadcast({ type: 'plc', connected: true }));
  poller.on('disconnected', (reason) => broadcast({ type: 'plc', connected: false, reason }));
  alarms.on('alarm', (alarm) => broadcast({ type: 'alarm', alarm }));

  // ---- 하트비트 ----
  const heartbeat = setInterval(() => {
    for (const client of wss.clients as Set<LiveSocket>) {
      if (client.isAlive === false) {
        client.terminate();
        continue;
      }
      client.isAlive = false;
      client.ping();
    }
  }, HEARTBEAT_MS);
  heartbeat.unref();
  wss.on('close', () => clearInterval(heartbeat));

  return wss;
}
