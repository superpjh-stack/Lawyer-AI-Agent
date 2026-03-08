# Mobile UX Plan -- Lawyer-Agent

> Product Manager Agent Output
> Date: 2026-03-08

---

## 1. Target User Persona & Mobile Usage Scenario

### Primary User: Solo / Small-Firm Lawyer (1-5 attorneys)

**Mobile Usage Context:**
- Courthouse hallway: checking next deadline, reviewing case brief before hearing
- Commute: reviewing AI chat responses, scanning document summaries
- Client meeting (outside office): quick case lookup, showing case status
- Weekend/evening: urgent deadline notification, quick billing entry
- On-the-go: voice-based AI consultation (already implemented via STT/TTS)

**Device Distribution (Korea legal market estimate):**
- Mobile (< 640px): 45% of total access
- Tablet (640px - 1024px): 15%
- Desktop (> 1024px): 40%

### Priority Matrix (Mobile Impact x Frequency)

| Feature | Mobile Frequency | Impact if Broken | Priority |
|---------|-----------------|------------------|----------|
| Sidebar Navigation | Every session | Critical (blocks all access) | P0 |
| AI Chat | Very High | High (core value prop) | P0 |
| Dashboard | High | Medium (overview) | P1 |
| Case List / Detail | High | High (court prep) | P1 |
| Deadlines | High | Critical (missed deadlines) | P1 |
| Document Upload | Medium | Medium | P2 |
| Advisory (3-step) | Low | High (desktop-centric workflow) | P2 |
| Drafting | Low | High (desktop-centric workflow) | P2 |
| Billing | Medium | Medium | P2 |
| Research | Medium | Medium | P2 |
| Clients | Medium | Low | P3 |

---

## 2. Mobile-First Navigation Strategy

### Current State
- Bottom tab bar shows only 5 of 10+ nav items
- No "More" menu or hamburger for remaining items
- Settings and logout only accessible via desktop sidebar

### Proposed Navigation Architecture

```
Mobile (< 768px):
  Bottom Tab Bar: [Dashboard] [Chat] [Cases] [Deadlines] [More...]
  "More" opens a slide-up sheet with remaining items:
    - Advisory, Research, Drafting, Documents, Clients, Billing, Settings, Logout

Tablet (768px - 1024px):
  Overlay Drawer (hamburger trigger in header)
  Full navigation list, dismisses on outside tap

Desktop (>= 1024px):
  Fixed sidebar (current behavior, no changes needed)
```

---

## 3. Page-by-Page Mobile UX Priorities

### P0: Sidebar / Navigation
- Add "More" tab to bottom nav (replaces Research which is less frequent)
- "More" opens half-sheet with all remaining nav items
- Ensure safe-area-inset-bottom works on iOS (already has class)

### P0: AI Chat Page
- Chat sidebar (conversation list) should be hidden by default on mobile
- Full-screen chat experience on mobile
- Recommended questions panel (right side) should be accessible via button, not visible
- Input area must not be obscured by mobile keyboard

### P1: Dashboard
- Stats grid already responsive (2 cols on mobile, 4 on desktop) -- good
- Quick actions grid already 2 cols -- good
- Review padding and font sizes for small screens

### P1: Case List
- Table already hides columns progressively -- good
- Consider card-based layout for mobile instead of table
- Pagination controls need touch-friendly sizing

### P1: Deadlines
- Card-based layout works well on mobile -- good
- D-Day badges are touch-friendly -- good
- Modal forms need keyboard-aware positioning

### P2: Advisory Page
- CRITICAL ISSUE: Fixed `w-80` left panel + flex right panel = broken on mobile
- Needs complete mobile layout: stacked vertically (form above, viewer below)
- Step indicator needs horizontal scroll or compact view

### P2: Drafting Page
- Same issue as Advisory: fixed `w-80` + flex layout
- Needs stacked layout on mobile

### P2: Documents
- Grid view already responsive -- good
- List view hides columns progressively -- good
- Upload area needs drag-and-drop alternative for mobile (tap to select)

### P2: Billing
- Summary cards already responsive (1 col mobile, 3 col desktop) -- good
- Table hides columns -- good

### P3: Clients
- Table hides columns progressively -- good
- Modal form already mobile-friendly (max-w-md with p-4 inset)

---

## 4. Critical Mobile UX Issues

### Issue 1: Bottom Nav Only Shows 5 Items (CRITICAL)
- 10+ nav items, but only top 5 shown
- Users cannot access: Advisory, Drafting, Research, Documents, Clients, Billing, Settings
- **Fix**: Replace 5th item with "More" tab

### Issue 2: Advisory & Drafting Pages Have Desktop-Only Layout (CRITICAL)
- Both use `flex gap-6` with fixed `w-80` sidebar
- On mobile screens, content either overflows or gets crushed
- **Fix**: Stack vertically on mobile, tabs or accordion for form/result

### Issue 3: Chat Page Three-Panel Layout (HIGH)
- Left sidebar + center chat + right recommended panel = 3 columns
- Only center shown on mobile, but conversation list toggle is awkward
- **Fix**: Default to chat-only on mobile, slide-in panels

### Issue 4: LaweeFloat Overlaps Bottom Nav (MEDIUM)
- Floating mascot positioned at bottom-right with `bottom: 20px`
- On mobile, bottom nav is ~56px tall, mascot overlaps it
- **Fix**: Increase bottom offset on mobile or hide mascot on mobile

### Issue 5: Notification/User Menu Dropdowns (LOW)
- Dropdown panels (`w-80`, `w-52`) may extend beyond viewport on small screens
- **Fix**: Full-width slide-up sheet on mobile instead of dropdown

---

## 5. Success Metrics

| Metric | Current (Estimated) | Target |
|--------|-------------------|--------|
| Mobile Lighthouse Performance | Not measured | > 80 |
| Touch target size compliance | ~60% | > 95% (48px minimum) |
| Mobile task completion rate | Unknown | > 90% for P0/P1 features |
| Time to key action (mobile) | Unknown | < 3 taps to any feature |
