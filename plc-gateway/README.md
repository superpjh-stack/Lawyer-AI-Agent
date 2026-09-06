# PLC Data Gateway

PLC(㈜임진강김치 김치 공장 설비: 냉장·냉동고 온도, 염수 염도, 소독수 농도, 세척수 온도, 금속검출, 자동포장기 등 15개 태그)에서 **1초에 1회** 데이터를 수집하여 REST API / WebSocket 으로 제공하고,
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
PLC_TAGS_FILE=./tags.json     # 현장 레지스터 주소·스케일·임계값 (생략 시 임진강김치 기본 태그 세트)
```

## 수집 항목 (㈜임진강김치 기본 태그 세트)

사업계획서 4.3 H/W 구입 내역과 2.5 데이터 집계 포인트를 기준으로 15개 태그를 기본 제공합니다
(`src/tags/imjingang.ts`). 알람 기준은 MES CCP 기준(세척수 1~15℃, 염수 염도 10±1% 등)을 참고한 초안입니다.

| 공정 | 태그 | 종류 | 단위 | 수집 장비 | LOW / HIGH (히스테리시스) |
|---|---|---|---|---|---|
| 숙성발효 | `aging_room_temp` 숙성고 온도 | analog | ℃ | 온도조절기 FOX-2003CC #1 | -3 / 5 (1) |
| 입고/보관 | `raw_cold_temp` 원재료 냉장창고 온도 | analog | ℃ | 온도조절기 #2 (WH-002) | -3 / 5 (1) |
| 포장/출고 | `product_cold_temp` 완제품 냉장창고 온도 | analog | ℃ | 온도조절기 #3 (WH-003) | -3 / 5 (1) |
| 입고/보관 | `freezer_temp` 냉동고 온도 | analog | ℃ | 온도조절기 #4 | -25 / -15 (1) |
| 절단/전처리 | `prep_room_temp` 전처리실 온도 | analog | ℃ | 온습도센서 THD-WD1-T | 5 / 25 (2) |
| 절단/전처리 | `prep_room_humidity` 전처리실 습도 | analog | % | 온습도센서 THD-WD1-T | - / 85 (3) |
| 세척/절임 | `brine_tank1_salinity` 염수탱크 1호 염도 | analog | % | 염도센서 #1 | 9 / 11 (0.3) |
| 세척/절임 | `brine_tank2_salinity` 염수탱크 2호 염도 | analog | % | 염도센서 #2 | 9 / 11 (0.3) |
| 세척/절임 | `sanitizer_ppm` 소독수 농도 | analog | ppm | 소독수 Interface Module | 8 / 15 (1) |
| 세척/절임 | `wash_water_temp` 세척수 온도 | analog | ℃ | 온습도센서 | 1 / 15 (1) |
| 금속검출 | `metal_detector_ng` 금속검출 NG | digital | ON/OFF | 금속검출기 | ON 시 즉시 |
| 금속검출 | `metal_inspected_count` 검사수량 | counter | EA | 금속검출기 | - |
| 금속검출 | `metal_rejected_count` 불합격수량 | counter | EA | 금속검출기 | - |
| 포장/출고 | `packer_running` 자동포장기 가동 | digital | ON/OFF | 아이스박스 자동포장기 KF 100 | - |
| 포장/출고 | `packer_count` 포장완료 수량 | counter | EA | 아이스박스 자동포장기 KF 100 | - |

레지스터 주소는 PLC 프로그램 확정 전 임시값(0~14 순차)입니다.

### 태그 정의 파일 (`PLC_TAGS_FILE`)

현장 PLC 에 맞게 주소·스케일·임계값을 바꾸려면 JSON 배열을 작성해 지정합니다. 값 = `raw × scale + offset`.

```json
[
  { "name": "aging_room_temp", "label": "숙성고 온도", "process": "숙성발효", "group": "냉장·냉동 온도",
    "kind": "analog", "unit": "℃", "register": 100, "scale": 0.1, "signed": true, "decimals": 1,
    "alarm": { "low": -3, "high": 5, "hysteresis": 1 } },
  { "name": "packer_count", "label": "포장완료 수량", "process": "포장/출고", "group": "검사·포장 수량",
    "kind": "counter", "unit": "EA", "register": 120, "scale": 1, "signed": false, "decimals": 0 }
]
```

- `kind`: `analog`(연속값, 차트) / `digital`(0·1 상태, 알람은 `high: 0.5, hysteresis: 0`) / `counter`(누적 수량)
- `group`: 같은 group 의 analog·counter 태그는 대시보드에서 한 차트에 그려집니다(단위가 같아야 함, 최대 4개 권장)
- `sim`: 시뮬레이터 파라미터(`base`, `amplitude`, `noise`, `periodSec`, `incrementEverySec`, `toggleProbability`, `holdSec`, `spikeDelta`). 실제 PLC 연동 시 불필요

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
| GET | `/api/v1/tags` | 태그 정의(공정, 그룹, 종류, 단위, 임계값, 레지스터) |
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
  "values": { "aging_room_temp": 1.5, "freezer_temp": -19.9, "brine_tank1_salinity": 9.98, "sanitizer_ppm": 10.4, "metal_detector_ng": 0, "packer_count": 128, "…": "…" },
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
│  ├─ config.ts             환경변수 로드/검증 (zod), 태그 정의 파일 로드
│  ├─ tags/imjingang.ts     ㈜임진강김치 기본 태그 세트 15개
│  ├─ types.ts              공통 타입 (Sample, Alarm, TagDefinition, Sink)
│  ├─ drivers/
│  │  ├─ PlcDriver.ts       드라이버 인터페이스
│  │  ├─ SimulatorDriver.ts 가상 PLC (태그 정의 기반 값 생성, 개발/시연)
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
├─ public/samples/          생성된 예시 샘플 (sample-500.json / .jsonl)
├─ scripts/generate-samples.ts  샘플 데이터 생성 스크립트
├─ scripts/build-standalone.ts  독립 실행형 HTML 빌드 스크립트
├─ test/                    node:test 단위 테스트
├─ .env.example             환경변수 설명
└─ Dockerfile
```

## 샘플 데이터 생성 / 리플레이 대시보드

```bash
npx tsx scripts/generate-samples.ts --count 500 --spike-at 60,300
# → public/samples/sample-500.json / .jsonl  (1초 간격 500건 ≒ 8분 20초 소요,
#    60초·300초째 온도 스파이크로 HIGH 알람 2회. 실제 폴러로 생성하므로 count 초만큼 걸립니다)
npm run dev
# → http://localhost:4000/replay.html  생성된 샘플을 1초에 1건씩 재생 (재생/일시정지/속도/끝으로, ?sample=N 으로 파일 선택)
```

실제 Poller + SimulatorDriver 경로로 생성하므로 타임스탬프 정렬, seq, latency, quality 필드가
운영 데이터와 동일한 형식입니다. `public/samples/sample-500.*` 는 예시 데이터로 저장소에 포함되어 있습니다.

서버 없이 파일만 열어도 동작하는 **독립 실행형 HTML** 은 아래로 만듭니다.

```bash
npx tsx scripts/build-standalone.ts
# → public/plc-replay-standalone.html  (대시보드 + 샘플 500건 인라인, 더블클릭으로 실행)
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

- **새 태그 추가**: `src/tags/imjingang.ts` 에 항목 추가 또는 `PLC_TAGS_FILE` JSON 지정. 대시보드는 자동 반영.
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
