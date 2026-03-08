# Mobile Responsive Design Specification

> Frontend Architect Agent Output
> Date: 2026-03-08

---

## 1. Exploration Summary: Current Responsive State

### Breakpoint Usage Inventory

| Breakpoint | Occurrences | Where Used |
|-----------|-------------|------------|
| `sm:` (640px) | 22 | Header padding, table column hiding, chat bubble width, form grids, billing stats |
| `md:` (768px) | 24 | Sidebar show/hide, table column hiding, case detail grid, chat sidebar |
| `lg:` (1024px) | 12 | Dashboard stats grid, case table columns, document grid, chat recommended panel |
| `xl:` (1280px) | 1 | Document grid only |
| `2xl:` | 0 | Not used |

**Total responsive breakpoint classes**: 63 across 14 files.

### Component-by-Component Assessment

| Component | Mobile Support | Grade | Critical Issues |
|-----------|---------------|-------|-----------------|
| **Sidebar** | Bottom tab bar (5 items) | B- | Only 5 of 10+ items accessible; no "More" menu |
| **Header** | Mobile logo + icon-only search | B+ | Dropdown menus may overflow viewport |
| **Layout** | Padding adjustment, bottom nav clearance | B | Works but `pb-20` is fragile |
| **Dashboard** | 2-col stats, stacked cards | A- | Minor: could optimize heading sizes |
| **Cases List** | Progressive column hiding | B+ | Table still wide on 320px screens |
| **Case Detail** | Flex-to-stack grid | B | Good partial support |
| **Case New** | 2-col to 1-col grid | A- | Good |
| **Chat Page** | 3-panel, partial mobile support | C | Left sidebar toggle awkward; right panel hidden below lg; no mobile-first design |
| **Advisory** | NO mobile support | D | Fixed `w-80` left panel breaks completely below ~900px |
| **Drafting** | NO mobile support | D | Fixed `w-80` left panel breaks completely below ~900px |
| **Research** | Basic responsive | B | Hardcoded `p-6` padding, search button layout |
| **Deadlines** | Card-based, good | A- | Works well |
| **Documents** | Grid + list views, progressive hiding | B+ | Good |
| **Clients** | Progressive column hiding | B+ | Good |
| **Billing** | Responsive stats, column hiding | B | Good |
| **LaweeFloat** | Fixed position, no mobile offset | C+ | Overlaps bottom nav bar |
| **ChatInterface** | Mostly good | B | Input area keyboard awareness |

### Overall Responsive Score: **C+**

**Breakdown:**
- 4 pages at A/A- level (dashboard, deadlines, case new, documents grid)
- 6 pages at B/B+ level (cases, clients, billing, header, case detail, research)
- 3 components at C/C+ level (chat page, lawee float, chat interface)
- 2 pages at D level (advisory, drafting) -- completely broken on mobile

---

## 2. Architecture Decision: Adaptive Navigation Pattern

### Mobile (< 768px / `md` breakpoint)

```
+----------------------------------+
|  Header (logo + search + user)   |
+----------------------------------+
|                                  |
|         Page Content             |
|         (full width)             |
|                                  |
+----------------------------------+
| Tab: Home | Chat | Cases | DL | More |
+----------------------------------+
```

**Bottom Tab Bar Changes:**
- Current items: Dashboard, Chat, Advisory, Research, Drafting (first 5 of navItems)
- Proposed items: Dashboard, Chat, Cases, Deadlines, More
- Rationale: Cases and Deadlines are high-frequency mobile actions; Advisory/Drafting are desktop-centric

**"More" Sheet:**
- Half-height slide-up overlay
- Contains: Advisory, Research, Drafting, Documents, Clients, Billing, Settings, Logout
- Dimmed backdrop, tap-outside-to-close

### Tablet (768px - 1024px / `md` to `lg`)

```
+----------------------------------+
|  [=] Header (full search + user) |
+----------------------------------+
| Overlay  |                       |
| Drawer   |    Page Content       |
| (toggle) |                       |
+----------------------------------+
```

- Hamburger icon in header triggers overlay drawer
- Drawer overlays content with backdrop
- Full navigation list in drawer

### Desktop (>= 1024px / `lg` breakpoint)

No changes needed. Current fixed sidebar works well.

---

## 3. Component-by-Component Responsive Design

### 3.1 Sidebar.tsx -- Bottom Tab with "More" Menu

**Changes Required:**

```
Current bottom nav: navItems.slice(0, 5)
Proposed bottom nav: [Dashboard, Chat, Cases, Deadlines, More]

"More" button:
- Opens a slide-up sheet (position: fixed, bottom: 0)
- Contains remaining items in a 2-column grid
- Settings and Logout at bottom
- Close button and backdrop overlay
```

**Implementation Outline:**
- Add `showMoreSheet` state
- Mobile bottom nav renders 4 nav items + 1 "More" button
- "More" triggers `showMoreSheet = true`
- Sheet component renders over content with z-50, includes all remaining navItems

### 3.2 LaweeFloat.tsx -- Mobile Bottom Offset

**Changes Required:**
- Detect mobile viewport and add additional bottom offset (~70px) to clear bottom nav
- Or: hide Lawee on mobile (simpler, less visual clutter)

**Implementation:**
```tsx
// Add bottom offset calculation
const mobileBottomOffset = 76; // bottom nav height + safe area
style={{ bottom: `${20 + position.y + (isMobile ? mobileBottomOffset : 0)}px` }}
```

Or simpler CSS approach:
```tsx
className="fixed z-50 ... hidden md:block"  // Hide on mobile entirely
```

**Recommendation:** Hide on mobile. The chat page provides the same AI access.

### 3.3 Chat Page -- Mobile-First Three Panel

**Changes Required:**

```
Mobile:
- Hide left sidebar by default (showSidebar = false on mobile)
- Hide right recommended panel entirely (accessible via header button)
- Full-screen chat experience
- Conversation list accessible via header hamburger

Tablet:
- Show left sidebar as overlay
- Hide right panel (accessible via button)

Desktop:
- Current 3-panel layout (no changes)
```

**Key Changes:**
- Default `showSidebar` to `false` on mobile (use `useMediaQuery` or window width check)
- Left sidebar: add overlay backdrop on mobile
- Right panel: already has `hidden lg:flex` -- good
- Chat header mobile toggle: already exists (`md:hidden` button) -- good
- Fix negative margin: `-m-4 sm:-m-6` needs review for mobile

### 3.4 Advisory Page -- Complete Mobile Redesign

**Current:** Fixed `w-80` left + flex right side-by-side (BROKEN on mobile)

**Proposed Mobile Layout:**
```
Mobile (< 1024px):
+----------------------------------+
| Step Indicator (horizontal scroll)|
+----------------------------------+
| Tab: [Form] [Viewer] [History]   |
+----------------------------------+
|                                  |
|   Active Tab Content             |
|   (full width, scrollable)       |
|                                  |
+----------------------------------+

Desktop (>= 1024px):
Current layout preserved (side-by-side)
```

**Implementation:**
- Wrap the `flex gap-6` container with `lg:flex` (hidden on mobile)
- Add mobile tab navigation for Form/Viewer/History
- Each tab shows its content full-width
- AdvisorySteps component: add `overflow-x-auto` for horizontal scroll on mobile

### 3.5 Drafting Page -- Complete Mobile Redesign

**Same pattern as Advisory:**

```
Mobile (< 1024px):
+----------------------------------+
| Page Header                      |
+----------------------------------+
| Tab: [Input] [Draft Result]      |
+----------------------------------+
|                                  |
|   Active Tab Content             |
|   (full width, scrollable)       |
|                                  |
+----------------------------------+
```

**Implementation:**
- Wrap `flex gap-6` with `lg:flex`
- Mobile: tab-based toggle between input form and draft result
- Input panel: remove fixed `w-80`, use full width on mobile
- Draft result: remove `h-[calc(100vh-12rem)]` fixed height on mobile, use min-height instead

### 3.6 Research Page -- Minor Fixes

**Changes:**
- Replace `p-6` with `p-4 sm:p-6` (already handled by layout padding)
- Search button: stack vertically on very small screens
- Add `page-header` and `page-title` classes for consistency

### 3.7 Header Dropdowns -- Mobile Adaptation

**Changes:**
- Notification dropdown (`w-80`): on mobile, use full-width with `left-0 right-0` instead of `right-0`
- User menu dropdown (`w-52`): same treatment
- Consider: slide-up sheet pattern instead of dropdown on mobile

### 3.8 Global CSS Updates

**Add to globals.css:**
```css
/* Mobile safe area for bottom nav */
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}

/* Page header responsive */
.page-header {
  @apply flex items-center justify-between mb-4 sm:mb-6;
}

.page-title {
  @apply text-xl sm:text-2xl font-bold text-slate-900;
}
```

---

## 4. Implementation Priority & Effort

### Phase 1: Critical Fixes (Day 1) -- Immediately Actionable

| Task | Component | Effort | Impact |
|------|-----------|--------|--------|
| 1. Bottom nav "More" menu | Sidebar.tsx | Medium | Unblocks all navigation |
| 2. Advisory mobile layout | advisory/page.tsx | Medium | Fixes D-grade page |
| 3. Drafting mobile layout | drafting/page.tsx | Medium | Fixes D-grade page |

### Phase 2: High-Value Improvements (Day 2-3)

| Task | Component | Effort | Impact |
|------|-----------|--------|--------|
| 4. Chat page mobile optimization | chat/page.tsx | Small | Better mobile chat UX |
| 5. LaweeFloat mobile handling | LaweeFloat.tsx | Small | Prevents overlap |
| 6. Header dropdown mobile | Header.tsx | Small | Better mobile dropdowns |

### Phase 3: Polish (Day 4+)

| Task | Component | Effort | Impact |
|------|-----------|--------|--------|
| 7. Research page consistency | research/page.tsx | Small | Visual consistency |
| 8. Touch target audit | All | Small | Accessibility compliance |
| 9. Viewport meta / PWA prep | layout.tsx / manifest | Small | Better mobile experience |

---

## 5. Shared Utilities Needed

### useMediaQuery Hook
```tsx
// src/hooks/useMediaQuery.ts
export function useMediaQuery(query: string): boolean {
  // SSR-safe media query hook
  // Used by: Chat page sidebar default, Advisory/Drafting tab toggle
}
```

### MobileSheet Component
```tsx
// src/components/ui/MobileSheet.tsx
// Half-sheet slide-up overlay
// Used by: "More" menu, notification panel, user menu on mobile
```

### MobileTabs Component
```tsx
// src/components/ui/MobileTabs.tsx
// Simple tab bar for switching between stacked views
// Used by: Advisory page, Drafting page
```

---

## 6. Breakpoint Strategy Confirmation

| Breakpoint | Tailwind | Target |
|-----------|----------|--------|
| Default (mobile-first) | No prefix | iPhone SE (375px) to 639px |
| `sm:` | 640px+ | Large phones, small tablets |
| `md:` | 768px+ | Tablets, sidebar visibility threshold |
| `lg:` | 1024px+ | Desktop, side-by-side layouts |
| `xl:` | 1280px+ | Wide desktop (minimal use) |

This project correctly uses mobile-first approach with Tailwind defaults. No custom breakpoints needed.

---

## 7. Files to Create/Modify

### New Files:
- `src/hooks/useMediaQuery.ts`
- `src/components/ui/MobileSheet.tsx`
- `src/components/ui/MobileTabs.tsx`

### Modified Files (by priority):
1. `src/components/layout/Sidebar.tsx` -- "More" menu
2. `src/app/(app)/advisory/page.tsx` -- mobile tab layout
3. `src/app/(app)/drafting/page.tsx` -- mobile tab layout
4. `src/app/(app)/chat/page.tsx` -- mobile defaults
5. `src/components/lawee/LaweeFloat.tsx` -- mobile offset/hide
6. `src/components/layout/Header.tsx` -- mobile dropdown
7. `src/app/(app)/research/page.tsx` -- consistency
8. `src/app/globals.css` -- responsive page-header/title
