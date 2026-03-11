# Plan: email-notification (이메일 알림 - 법원 기일 D-3/D-1 자동 발송)

## 개요

법원 기일(Deadline)이 3일 전, 1일 전에 담당 변호사에게 자동으로 이메일을 발송하여
기일 누락 사고를 방지한다. Resend API + 외부 Cron(cron-job.org)으로 서버리스 스케줄링을 구현한다.

## 목표 (Why)

- 법원 기일 누락은 법무법인에서 치명적 실수 — 자동 리마인더로 리스크 제거
- 담당 변호사가 앱에 로그인하지 않아도 이메일로 확인 가능
- Prisma `reminderSent` 플래그로 중복 발송 방지

## 범위 (Scope)

### In-Scope

- D-3 (3일 전), D-1 (1일 전) 기일 자동 이메일 알림
- 담당 사건의 `assignedUser` 이메일로 발송
- `Deadline.reminderSent = true` 업데이트로 중복 발송 방지
- Bearer token 인증으로 외부 Cron 호출 보안 처리
- 알림 설정 UI (on/off 토글) — 설정 저장은 향후 구현
- RESEND_API_KEY 없을 경우 mock(console.log) 처리

### Out-of-Scope

- SMS 알림
- D-7(7일 전) 등 추가 알림 구간
- 사용자별 알림 설정 DB 저장 (향후 UserNotificationSettings 모델 추가 예정)
- 앱 내 Push Notification
- 이메일 발송 이력 DB 저장

## 사용자 스토리

1. 변호사가 기일을 등록하면 D-3, D-1에 이메일을 받고 싶다
2. 매일 아침 09:00 Cron이 실행되어 오늘 기준 D-3, D-1 기일을 조회한다
3. 담당 변호사 이메일로 "기일 3일 전 알림" 메일이 발송된다
4. 발송 후 `reminderSent = true`로 업데이트되어 내일 다시 발송되지 않는다

## 기술 스택

- **이메일**: [Resend](https://resend.com) (`resend` npm 패키지)
- **Cron**: cron-job.org 또는 GitHub Actions (외부 스케줄러에서 HTTP GET 호출)
- **인증**: `Authorization: Bearer <CRON_SECRET>` 헤더 검증
- **DB**: Prisma `Deadline` 모델 (`reminderSent` 필드 기존 존재)

## 성공 기준

- [ ] `/api/email/deadline-check` GET → D-3, D-1 기일 조회 후 이메일 발송
- [ ] `reminderSent = false` 인 기일만 대상 (중복 방지)
- [ ] 발송 성공 시 `reminderSent = true` 업데이트
- [ ] RESEND_API_KEY 없을 시 console.log mock 처리
- [ ] Bearer token 미제공 시 401 반환
- [ ] `/settings/notifications` 페이지 — 이메일 알림 on/off UI 존재

## 우선순위

**P0 (필수)**: Resend 클라이언트 + deadline-check API + cron 인증
**P1 (중요)**: 이메일 HTML 템플릿 (브랜딩 포함)
**P2 (선택)**: 알림 설정 UI + 사용자별 알림 on/off DB 저장

## 예상 작업량

- 라이브러리: `npm install resend`
- 신규 파일: `src/lib/email/resend.ts` (클라이언트 + 템플릿 + 발송 함수)
- 신규 파일: `src/app/api/email/deadline-check/route.ts` (Cron 엔드포인트)
- 신규 파일: `src/app/(app)/settings/notifications/page.tsx` (UI)
- 환경변수: `RESEND_API_KEY`, `CRON_SECRET`
- 총 예상: 반나절
