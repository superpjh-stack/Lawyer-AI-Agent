# Settings Pages Feature Plan

## Overview

Implement three currently-empty settings sub-pages for the LexAgent application:
1. `/settings/notifications` — Notification preferences
2. `/settings/team` — Team member management
3. `/settings/subscription` — Plan and billing overview

## Goals

- Provide complete UI for the three settings sub-pages that are listed in the roadmap but not yet implemented
- Follow the existing design language established by `/settings/profile`
- Use mock data where live API endpoints are not yet available
- All pages must be mobile-responsive

## User Stories

### Notifications
- As a lawyer, I want to configure which email and browser notifications I receive so that I only get alerts that are relevant to me
- As a user, I want to toggle deadline reminders (D-3 and D-1) independently so I can fine-tune my alert cadence

### Team
- As a firm admin, I want to view all team members and their roles so I can manage access
- As a firm admin, I want to invite new members via email so I can grow the team within the platform
- As a firm admin, I want to change a member's role so I can promote or demote people as responsibilities change

### Subscription
- As a firm admin, I want to see the current plan and compare it against other tiers so I can decide whether to upgrade
- As a user, I want to see the next billing date and amount so I can plan our budget

## Scope

### In Scope
- `/settings/notifications` — toggle switches for email and browser notification types, save button with toast feedback
- `/settings/team` — member list (mock data), invite modal (UI only), role dropdown (UI only), plan quota display
- `/settings/subscription` — plan comparison cards, upgrade CTA (UI only), billing summary (mock data)
- Sidebar: confirm all three pages are accessible from Settings navigation

### Out of Scope
- Real API endpoints for notification persistence (future: POST /api/settings/notifications)
- Real email invitation sending (future: Resend integration)
- Real payment processing or Stripe integration
- Settings notification sub-page: actual push notification permissions (browser API)

## Success Criteria

- All three pages render without TypeScript errors
- Pages follow the same card-based layout as `/settings/profile`
- Mobile-responsive layouts verified for each page
- Sidebar bottom section links to the settings area

## Dependencies

- `src/components/ui/Button.tsx` — primary CTA buttons
- `src/components/ui/Card.tsx` — card layout
- `next-auth` session — to read current user role and firmName
- Prisma schema `Firm` model — plan, maxUsers fields (read for display only)

## Timeline

Single-iteration implementation. All three pages delivered together.
