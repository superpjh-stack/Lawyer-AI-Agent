# Redis Caching — Feature Plan

## Overview

LexAgent의 판례 검색, 법령 검색, 지식베이스 통계 API의 응답속도를 Upstash Redis 캐싱으로 개선한다.

## Problem Statement

| 엔드포인트 | 현재 평균 응답시간 | 병목 원인 |
|---|---|---|
| `GET /api/research/case-law` | ~1,200ms | 외부 국가법령정보 API 호출 + pgvector 유사도 검색 |
| `GET /api/knowledge/stats` | ~400ms | PostgreSQL aggregate 쿼리 (문서/청크 수 집계) |

동일 쿼리가 반복 호출될 때마다 매번 외부 API 및 DB를 조회하는 것은 불필요한 비용과 지연을 유발한다.

## Goals

1. 판례 검색 결과를 10분간 캐싱해 반복 검색 응답시간을 <50ms로 단축
2. 지식베이스 통계를 5분간 캐싱해 대시보드 로딩 속도 개선
3. 개발 환경에서 Upstash 미설정 시 in-memory Map fallback으로 즉시 동작
4. 캐시 히트 여부를 `X-Cache` 헤더로 노출해 디버깅 지원

## Non-Goals

- 사용자 인증 토큰 캐싱 (보안 리스크)
- 문서 내용(content) 캐싱
- Cache invalidation UI (수동 TTL 만료로 충분)

## Target Endpoints

### 1. `GET /api/research/case-law`
- 캐시 키: `case-law:{query}:{type}:{page}:{pageSize}`
- TTL: 600초 (10분)
- 판단 근거: 법령 데이터는 실시간성이 낮고 동일 키워드 반복 검색 빈도가 높음

### 2. `GET /api/knowledge/stats`
- 캐시 키: `knowledge-stats:{userId}`
- TTL: 300초 (5분)
- 판단 근거: 통계는 문서 업로드 시만 변경되므로 짧은 TTL로 충분

## Tech Stack

- **Redis provider**: Upstash Redis (serverless, REST API, Edge 호환)
- **SDK**: `@upstash/redis`
- **Fallback**: `Map<string, {value, expiresAt}>` (Upstash 미설정 시)

## Environment Variables

```env
UPSTASH_REDIS_REST_URL=https://<instance>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

## Expected Outcomes

| 지표 | Before | After (cache HIT) |
|---|---|---|
| 판례 검색 (반복) | ~1,200ms | <50ms |
| 지식베이스 통계 (반복) | ~400ms | <20ms |
| 외부 API 호출 절감 | - | ~80% 감소 (반복 쿼리 기준) |

## Risks

- **데이터 신선도**: TTL 만료 전 법령 업데이트 시 구 데이터 노출 가능 → 허용 범위 내 (판례 데이터는 일 단위 갱신)
- **Upstash 비용**: 무료 티어 10,000 req/day → 현재 트래픽으로 충분
- **Cold start**: 첫 요청은 캐시 미스로 기존과 동일한 응답시간

## Implementation Plan

1. `src/lib/cache/redis.ts` — Redis 클라이언트 + 캐시 유틸 라이브러리
2. `src/app/api/research/case-law/route.ts` — 캐싱 주입
3. `src/app/api/knowledge/stats/route.ts` — 캐싱 주입
4. `.env.local` — Upstash 환경변수 주석 추가
