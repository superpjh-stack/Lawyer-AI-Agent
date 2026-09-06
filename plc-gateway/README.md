# PLC Data Gateway

PLC(온도·압력)에서 **1초에 1회** 데이터를 수집하여 REST API / WebSocket 으로 제공하고,
파일·상위 서버로 전달하는 경량 Data Gateway 서버입니다.

```
PLC ──(Modbus TCP / 시뮬레이터)──▶ Poller(1s) ──▶ DataStore(링버퍼) ──▶ REST API
                                        ├──▶ AlarmEngine(임계값) ──▶ WebSocket 푸시
                                        └──▶ Sinks(JSONL 파일 / HTTP 전달)
```

## 빠른 시작

```bash
cd plc-gateway
npm install
npm run dev            # 시뮬레이터 모드로 기동 (실제 PLC 불필요)
# → http://localhost:4000  실시간 대시보드
```

실제 PLC(Modbus TCP)에 붙이려면 `.env.example` 을 `.env` 로 복사한 뒤:

```ini
PLC_DRIVER=modbus-tcp
PLC_HOST=192.168.0.10
PLC_PORT=502
PLC_UNIT_ID=1
PLC_TEMP_REGISTER=0        # 온도 레지스터 주소 (0-base)
PLC_TEMP_SCALE=0.1         # raw 253 → 25.3 ℃
PLC_PRESSURE_REGISTER=1
PLC_PRESSURE_SCALE=0.01    # raw 305 → 3.05 bar
```

## 주요 기능

| 기능 | 설명 |
|---|---|
| 고정 주기 폴링 | `setTimeout` 기반 드리프트 보정으로 매 정초(xx:xx:01.000, 02.000 …)에 정렬 수집 |
| 타임아웃 보호 | 읽기가 `POLL_TIMEOUT_MS`(기본 800ms) 를 넘으면 BAD 로 기록, 다음 틱과 겹치지 않음 |
| 자동 재접속 | 읽기 실패 시 다음 틱에 즉시 재접속, 연결 실패가 반복되면 1s→2s→4s…30s 지수 백오프 |
| 데이터 품질 | 통신 장애 구간도 `quality: "BAD"` 샘플로 기록해 데이터 공백을 명시 |
| 알람 | HIGH/LOW 임계값 + 히스테리시스(chattering 방지), 발생/해제 이벤트 |
| 링버퍼 | 최근 3600건(1시간) 인메모리 보관, 메모리 사용량 일정 |
| 싱크 | JSONL 일자별 파일 / 상위 서버 HTTP 배치 전송(실패 시 재시도, 버퍼 상한) |
| 실시간 푸시 | WebSocket `/ws` 로 매 초 샘플·알람·PLC 상태 브로드캐스트 |
| 관측성 | `/health`, `/metrics`(Prometheus), 구조화 JSON 로그 |
| 보안 | `GATEWAY_API_KEY` 설정 시 API/WS 에 `X-API-Key` 요구 |

## REST API

기본 포트 4000. `GATEWAY_API_KEY` 설정 시 `/api/*` 에 `X-API-Key` 헤더 필요.

| Method | Path | 설명 |
|---|---|---|
| GET | `/health` | 게이트웨이/PLC 상태 (인증 없음) |
| GET | `/metrics` | Prometheus 메트릭 (인증 없음) |
| GET | `/api/v1/tags` | 태그 정의(단위, 임계값, 레지스터) |
| GET | `/api/v1/latest` | 최신 샘플 1건 |
| GET | `/api/v1/history?limit=300&since=<ISO or epochMs>&goodOnly=true` | 이력 (시간순) |
| GET | `/api/v1/stats?window=60` | 최근 N초 통계 (min/max/avg) |
| GET | `/api/v1/alarms?active=true` | 활성 알람 / 이력 |

샘플 형식:

```json
{
  "seq": 128,
  "ts": "2026-09-06T02:26:07.012Z",
  "epochMs": 1788661567012,
  "values": { "temperature": 25.2, "pressure": 2.98 },
  "quality": "GOOD",
  "latencyMs": 11
}
```

## WebSocket

`ws://localhost:4000/ws` (`?apiKey=` 필요 시)

| type | 시점 | 내용 |
|---|---|---|
| `snapshot` | 접속 직후 | 최신값, 활성 알람, 태그 정의, 최근 300건 이력 |
| `sample` | 매 초 | `Sample` 1건 |
| `alarm` | 발생/해제 | `Alarm` |
| `plc` | 연결 상태 변화 | `{ connected, reason? }` |

## 디렉터리 구조

```
plc-gateway/
├─ src/
│  ├─ index.ts              진입점 - 구성요소 배선, graceful shutdown
│  ├─ config.ts             환경변수 로드/검증 (zod), 태그 정의
│  ├─ types.ts              공통 타입 (Sample, Alarm, TagDefinition, Sink)
│  ├─ drivers/
│  │  ├─ PlcDriver.ts       드라이버 인터페이스
│  │  ├─ SimulatorDriver.ts 가상 PLC (개발/시연)
│  │  ├─ ModbusTcpDriver.ts Modbus TCP 구현 (블록 읽기, 스케일 변환)
│  │  └─ index.ts           드라이버 팩토리
│  ├─ core/
│  │  ├─ Poller.ts          1초 고정 주기 스케줄러, 타임아웃, 재접속
│  │  ├─ DataStore.ts       링버퍼 저장소, 이력/통계 조회
│  │  └─ AlarmEngine.ts     임계값·히스테리시스 알람
│  ├─ sinks/
│  │  ├─ JsonlFileSink.ts   일자별 JSONL 파일 기록
│  │  ├─ HttpForwardSink.ts 상위 서버 배치 전송
│  │  └─ index.ts           싱크 팩토리
│  ├─ server/
│  │  ├─ httpServer.ts      Express REST API, /health, /metrics, 정적 파일
│  │  └─ wsServer.ts        WebSocket 브로드캐스트, 하트비트
│  └─ utils/logger.ts       JSON 구조화 로거
├─ public/index.html        실시간 대시보드 (WebSocket, 외부 의존성 없음)
├─ public/replay.html       샘플 리플레이 대시보드 (1초에 1건 재생)
├─ public/plc-replay-standalone.html  독립 실행형 리플레이 (데이터 인라인, 서버 불필요)
├─ public/samples/          생성된 예시 샘플 (sample-100.json / .jsonl)
├─ scripts/generate-samples.ts  샘플 데이터 생성 스크립트
├─ scripts/build-standalone.ts  독립 실행형 HTML 빌드 스크립트
├─ test/                    node:test 단위 테스트
├─ .env.example             환경변수 설명
└─ Dockerfile
```

## 샘플 데이터 생성 / 리플레이 대시보드

```bash
npx tsx scripts/generate-samples.ts --count 100 --spike-at 60
# → public/samples/sample-100.json / .jsonl  (1초 간격 100건, 60초째 온도 스파이크로 HIGH 알람 1회)
npm run dev
# → http://localhost:4000/replay.html  생성된 샘플을 1초에 1건씩 재생 (재생/일시정지/속도/끝으로)
```

실제 Poller + SimulatorDriver 경로로 생성하므로 타임스탬프 정렬, seq, latency, quality 필드가
운영 데이터와 동일한 형식입니다. `public/samples/sample-100.*` 는 예시 데이터로 저장소에 포함되어 있습니다.

서버 없이 파일만 열어도 동작하는 **독립 실행형 HTML** 은 아래로 만듭니다.

```bash
npx tsx scripts/build-standalone.ts
# → public/plc-replay-standalone.html  (대시보드 + 샘플 100건 인라인, 더블클릭으로 실행)
```

## 스크립트

```bash
npm run dev         # tsx watch 로 개발 실행
npm run build       # dist/ 로 컴파일
npm start           # 컴파일된 서버 실행
npm test            # 단위 테스트 (Poller, DataStore, AlarmEngine, Modbus 디코딩, 설정)
npm run typecheck
```

## Docker

```bash
docker build -t plc-gateway ./plc-gateway
docker run -p 4000:4000 \
  -e PLC_DRIVER=modbus-tcp -e PLC_HOST=192.168.0.10 \
  -e SINK_JSONL_ENABLED=true -v $(pwd)/data:/app/data \
  plc-gateway
```

## 확장 포인트

- **새 태그 추가**: `types.ts` 의 `TagName` 유니온과 `config.ts` 의 태그 정의에 항목 추가.
- **새 프로토콜**: `drivers/PlcDriver.ts` 인터페이스를 구현하고 `drivers/index.ts` 팩토리에 등록
  (예: S7, MC Protocol, OPC UA).
- **새 출력 채널**: `types.ts` 의 `Sink` 인터페이스 구현 (예: MQTT, Kafka, DB insert) 후
  `sinks/index.ts` 에 등록.
- **32bit 레지스터(float/int32)**: `ModbusTcpDriver.decodeRegister` 를 확장.

## 운영 시 참고

- `POLL_TIMEOUT_MS` 는 반드시 `POLL_INTERVAL_MS` 보다 작게 설정하세요 (기동 시 검증).
- `/health` 는 PLC 가 끊겨도 HTTP 200 을 반환하고 `status: "degraded"` 로 표시합니다.
  프로세스 생존과 PLC 연결 상태를 구분하기 위함입니다.
- JSONL 파일은 하루 단위로 분리되며 1초 주기 기준 하루 약 15MB 입니다. 별도의 보관 주기 정책을 두세요.
