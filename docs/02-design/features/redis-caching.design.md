# Redis Caching — Technical Design

## Architecture

```
Client Request
     │
     ▼
Next.js API Route
     │
     ├─► Cache Layer (src/lib/cache/redis.ts)
     │        │
     │        ├─ HIT ──► return cached JSON  (X-Cache: HIT)
     │        │
     │        └─ MISS ─► Business Logic
     │                        │
     │                        ├─ External API / DB
     │                        │
     │                        └─► cache.set(key, result, ttl)
     │                                   │
     ▼                                   ▼
 Response                         Upstash Redis
                                  (or in-memory Map)
```

## Module: `src/lib/cache/redis.ts`

### Singleton Pattern

```typescript
// Upstash REST SDK를 동적으로 초기화
// 환경변수 미설정 시 InMemoryCache로 전환
const client: RedisClient = createRedisClient();
```

### Interface

```typescript
interface CacheClient {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  del(key: string): Promise<void>;
}

function generateKey(prefix: string, ...parts: string[]): string;
```

### InMemoryCache (Fallback)

```typescript
class InMemoryCache implements CacheClient {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string): Promise<void> {
    this.store.delete(key);
  }
}
```

### UpstashCache (Production)

- `@upstash/redis` Redis 클래스 사용
- `get()`: Upstash REST GET → JSON.parse
- `set()`: Upstash REST SET with EX option
- `del()`: Upstash REST DEL

## Cache Key Schema

| Endpoint | Prefix | Parts | Example Key |
|---|---|---|---|
| case-law (keyword) | `case-law` | query, type, page, pageSize | `case-law:손해배상:keyword:1:20` |
| case-law (semantic) | `case-law` | query, type, page, pageSize | `case-law:부동산분쟁:semantic:1:20` |
| knowledge stats | `knowledge-stats` | userId | `knowledge-stats:clxyz123` |

### Key Sanitization

부분 문자열 중 Redis 키에 허용되지 않는 문자를 처리하기 위해 `generateKey`는 각 part를 URL-encode하거나 공백을 `_`로 치환한다.

## TTL Strategy

| 캐시 | TTL | 근거 |
|---|---|---|
| 판례 검색 | 600s (10분) | 외부 API 응답 변경 주기 ≥ 1일 |
| 지식베이스 통계 | 300s (5분) | 문서 업로드는 드물고, 오차 허용 |

## Response Headers

캐시 히트 시 `X-Cache: HIT` 헤더를 응답에 추가해 클라이언트/개발자가 캐시 상태를 확인할 수 있도록 한다.

## Integration Points

### `GET /api/research/case-law/route.ts`

```
1. Parse: query, type, page, pageSize
2. cacheKey = generateKey('case-law', query, type, page, pageSize)
3. cached = await cache.get(cacheKey)
4. if cached → return NextResponse.json(cached, headers: { 'X-Cache': 'HIT' })
5. result = [keyword | semantic | hybrid search]
6. await cache.set(cacheKey, { data: result }, 600)
7. return NextResponse.json({ data: result })
```

### `GET /api/knowledge/stats/route.ts`

```
1. session.user.id 확인
2. cacheKey = generateKey('knowledge-stats', userId)
3. cached = await cache.get(cacheKey)
4. if cached → return NextResponse.json({ data: cached })
5. stats = await getKnowledgeStats(userId)
6. await cache.set(cacheKey, stats, 300)
7. return NextResponse.json({ data: stats })
```

## Error Handling

- Redis 오류(네트워크, 인증 실패) → catch 후 경고 로그, 캐시 없이 원본 로직 실행
- 캐시 오류는 절대 사용자 응답에 영향을 주지 않음 (best-effort caching)

## Dependencies

```json
{
  "@upstash/redis": "^1.x"
}
```

## File List

| 파일 | 역할 |
|---|---|
| `src/lib/cache/redis.ts` | Redis 클라이언트 + 유틸 (신규) |
| `src/app/api/research/case-law/route.ts` | 캐싱 적용 (수정) |
| `src/app/api/knowledge/stats/route.ts` | 캐싱 적용 (수정) |
| `.env.local` | Upstash 환경변수 주석 추가 (수정) |
