# Design: email-notification (이메일 알림 설계)

## 아키텍처 개요

```
[외부 Cron (cron-job.org)]
        │  GET /api/email/deadline-check
        │  Authorization: Bearer <CRON_SECRET>
        ▼
[Next.js Route Handler]
  ├── Bearer token 검증
  ├── Prisma: 오늘 기준 D-3, D-1 Deadline 조회 (reminderSent=false)
  ├── 각 기일의 case.assignedUser.email 조회
  ├── sendDeadlineReminder() 호출 (Resend API)
  └── Deadline.reminderSent = true 업데이트
```

## 파일 구조

```
src/
  lib/
    email/
      resend.ts          # Resend 클라이언트 싱글턴 + 템플릿 + sendDeadlineReminder()
  app/
    api/
      email/
        deadline-check/
          route.ts       # GET 핸들러 (Cron 엔드포인트)
    (app)/
      settings/
        notifications/
          page.tsx       # 알림 설정 UI
```

## DB 쿼리 로직

### D-3 기일 조회
```
dueDate >= today+3 00:00:00 AND dueDate < today+3 23:59:59
AND reminderSent = false
AND status = 'pending'
```

### D-1 기일 조회
```
dueDate >= today+1 00:00:00 AND dueDate < today+1 23:59:59
AND reminderSent = false
AND status = 'pending'
```

두 쿼리를 OR로 묶어 한 번에 조회:
```prisma
where: {
  status: 'pending',
  reminderSent: false,
  dueDate: { gte: targetDates.min, lte: targetDates.max }
}
// 이후 JS 단에서 daysLeft 계산하여 D-3 / D-1 분류
```

## Resend 클라이언트 설계 (`src/lib/email/resend.ts`)

```typescript
// 싱글턴 패턴 (process.env.RESEND_API_KEY 없으면 mock)
export const resendClient: Resend | null

// 타입
export interface DeadlineEmailData {
  to: string
  lawyerName: string
  caseTitle: string
  caseNumber: string
  deadlineTitle: string
  dueDate: Date
  daysLeft: number  // 1 또는 3
}

// HTML 이메일 템플릿 생성
function buildDeadlineEmailHtml(data: DeadlineEmailData): string

// 발송 함수 (mock 시 console.log 처리)
export async function sendDeadlineReminder(data: DeadlineEmailData): Promise<boolean>
```

### 이메일 발송 설정

| 항목 | 값 |
|------|-----|
| from | `LexAgent <notifications@lexagent.kr>` |
| subject | `[LexAgent] ⚖️ ${data.daysLeft}일 후 기일 알림 — ${data.caseNumber}` |
| reply-to | (없음) |
| API key | `process.env.RESEND_API_KEY` |

## API Route 설계 (`/api/email/deadline-check`)

### 요청
```
GET /api/email/deadline-check
Authorization: Bearer <CRON_SECRET>
```

### 응답 (성공)
```json
{
  "data": {
    "checked": 5,
    "sent": 3,
    "failed": 0,
    "deadlines": [
      { "id": "...", "title": "...", "dueDate": "...", "daysLeft": 3, "sent": true }
    ]
  }
}
```

### 응답 (인증 실패)
```json
{ "error": { "message": "Unauthorized" } }
// HTTP 401
```

### 처리 흐름

1. `Authorization` 헤더에서 Bearer token 추출
2. `process.env.CRON_SECRET`과 비교 → 불일치 시 401
3. 오늘 날짜 기준 D-3, D-1 날짜 범위 계산
4. Prisma로 해당 범위 Deadline 조회 (include: case.assignedUser)
5. 각 Deadline에 대해 `sendDeadlineReminder()` 호출
6. 성공 시 `prisma.deadline.update({ reminderSent: true })`
7. 집계 결과 반환

## 알림 설정 UI (`/settings/notifications/page.tsx`)

### 컴포넌트 구조
- 페이지 헤더: "알림 설정"
- 섹션: "이메일 알림"
  - 이메일 알림 전체 on/off 토글
  - 기일 D-3 알림 토글
  - 기일 D-1 알림 토글
- 안내 텍스트: "설정은 현재 UI 전용입니다. 서버 저장은 향후 업데이트 예정"

### UI 상태
```typescript
interface NotificationSettings {
  emailEnabled: boolean
  deadlineD3: boolean
  deadlineD1: boolean
}
```

## 환경변수

| 변수명 | 설명 | 예시값 |
|--------|------|--------|
| `RESEND_API_KEY` | Resend.com에서 발급 | `re_xxxx...` |
| `CRON_SECRET` | Cron 호출 인증 토큰 | `lexagent-cron-secret-2026` |

## 보안 고려사항

- `CRON_SECRET`은 충분히 긴 랜덤 문자열 사용 권장 (prod 환경)
- Resend 도메인 인증 필요 (`lexagent.kr` SPF/DKIM 설정)
- Rate limit: 현재 Deadline 수가 적어 별도 throttle 불필요
- 이메일 주소 노출 없음 (서버 사이드에서만 처리)

## Cron 설정 예시 (cron-job.org)

```
URL: https://your-domain.com/api/email/deadline-check
Method: GET
Headers:
  Authorization: Bearer lexagent-cron-secret-2026
Schedule: 0 0 * * * (매일 09:00 KST = 00:00 UTC)
```
