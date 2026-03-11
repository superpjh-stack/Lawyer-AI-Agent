# Settings Pages Design Document

## Design Principles

All three pages inherit the design language established by `/settings/profile`:
- Max width: `max-w-2xl mx-auto`
- Rounded card containers: `bg-white rounded-2xl border border-slate-200 p-6 mb-6`
- Section headings: `text-sm font-semibold text-slate-900 mb-4`
- Description text: `text-xs text-slate-400 mb-4`
- Color palette: navy-900 for primary actions, slate-* for neutral text, amber for admin badges
- `"use client"` directive on all pages (interactive toggles and modals)

---

## 1. `/settings/notifications`

### Layout

```
page-header (h1: 알림 설정)

Card: 이메일 알림
  ├─ Row: 기일 D-3 알림   [toggle]
  ├─ Row: 기일 D-1 알림   [toggle]
  └─ Row: 사건 업데이트   [toggle]

Card: 브라우저 알림
  ├─ Row: 채팅 메시지     [toggle]
  └─ Row: 시스템 알림     [toggle]

[저장] Button  +  saved toast inline message
```

### Toggle Component

Inline CSS toggle switch (no external library needed):
- Active: `bg-navy-900`
- Inactive: `bg-slate-200`
- Accessible via `role="switch"` and `aria-checked`

### State

```ts
type NotificationSettings = {
  emailDeadlineD3: boolean;
  emailDeadlineD1: boolean;
  emailCaseUpdates: boolean;
  browserChat: boolean;
  browserSystem: boolean;
};
```

Default: all `true`.

### Interactions

- Toggling a switch updates local state immediately
- "저장" button simulates a 600ms API call then shows "저장되었습니다." inline for 2.5s (same pattern as profile page)

---

## 2. `/settings/team`

### Layout

```
page-header (h1: 팀 관리)

Card: 팀 플랜 요약
  ├─ 현재 플랜: {plan} 뱃지
  ├─ 멤버 수: {members} / {maxUsers}명
  └─ [멤버 초대] Button  →  opens invite modal

Card: 팀 멤버 목록
  └─ MemberRow × N
       ├─ Avatar (initial letter)
       ├─ Name + Email
       ├─ Role badge (관리자 / 멤버)
       └─ [역할 변경] dropdown (UI only, disabled for self)

Modal: 멤버 초대
  ├─ Email input
  ├─ Role select (관리자 / 멤버)
  └─ [초대 발송] Button  →  toast "초대 이메일을 발송했습니다." (UI only)
```

### Mock Data

```ts
const MOCK_MEMBERS = [
  { id: "1", name: "Jay Park", email: "hyunsoo@lexagent.kr", role: "admin" },
  { id: "2", name: "Mina Jung", email: "mina@lexagent.kr", role: "member" },
  { id: "3", name: "Admin", email: "admin@lexagent.kr", role: "admin" },
];
const MOCK_FIRM = { plan: "team", maxUsers: 10 };
```

### State

- `inviteOpen: boolean` — controls modal visibility
- `inviteEmail: string` — controlled input
- `inviteRole: "admin" | "member"` — select value
- `inviteSent: boolean` — success feedback flag

---

## 3. `/settings/subscription`

### Layout

```
page-header (h1: 구독 및 플랜)

Card: 현재 플랜 (highlighted if active)
  └─ Plan grid (3 columns on md+, stacked on mobile)
       ├─ Personal  — ₩0/월, 1 사용자, ...
       ├─ Team      — ₩49,000/월, 10 사용자, ...  ← current plan highlighted
       └─ Enterprise — 문의, 무제한, ...

Card: 청구 정보 (Billing Summary)
  ├─ 다음 결제일: 2026-04-11
  ├─ 결제 금액: ₩49,000
  └─ 결제 수단: Visa **** 4242

Card: 업그레이드 안내
  └─ [Enterprise 문의하기] Button → toast "영업팀에 문의 요청이 발송되었습니다."
```

### Plan Feature Matrix

| Feature          | Personal | Team  | Enterprise |
|------------------|----------|-------|------------|
| 사용자 수        | 1        | 10    | 무제한     |
| AI 대화          | 50/월    | 500/월 | 무제한    |
| 문서 저장        | 1 GB     | 10 GB | 무제한     |
| 판례 검색        | O        | O     | O          |
| 지식베이스 RAG   | X        | O     | O          |
| 우선 지원        | X        | X     | O          |

### Current Plan Detection

Read `session.user.firmName` and compare against `MOCK_FIRM.plan` for highlight logic.

---

## Sidebar Update

The Sidebar `bottomItems` array currently contains:
- `/settings/profile` (Settings icon)
- `/settings/knowledge` (Brain icon)

No additional entries are required for notifications/team/subscription — these are sub-pages accessible from within the settings area. They are referenced via links on the profile page's section or via direct navigation. A settings sub-nav strip can optionally be added at the top of each settings page for easy jumping between sub-sections.

A settings sub-nav component will be embedded at the top of each settings page:
```
프로필 | 알림 | 팀 관리 | 구독 | 지식베이스
```
This keeps sidebar clean while making sub-pages discoverable.
