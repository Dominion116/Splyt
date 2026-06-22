# Splyt — New Features Backlog

Each feature is self-contained and can be built independently.
Work through them one at a time.

---

## Tier 1 — Quick Wins

### 1. Draft Recovery on Home Screen ✅ DONE
**What:** Show abandoned drafts from IndexedDB on the home screen so users can resume an incomplete split.  
**Delivered across 25 commits:**
- `lib/draft.ts` — added `purgeOldDrafts()` and `getDraftCount()` utilities
- `DraftRecoveryList.tsx` — full component with mount guard, auto-purge, malformed-draft filter, item count, mode badge, first-item hint, aria-label, empty-members fallback, live count in heading, motion entry, AnimatePresence exit, show-all toggle, clear-all with confirm, empty-state fade-in
- `app/app/page.tsx` — draft list shown above "New split" CTA
- `app/app/history/page.tsx` — draft list also shown at the top of History tab with divider

---

### 2. Payment Link Sheet (QR / Share) ✅ DONE
**What:** When the host taps the copy-link icon next to an unpaid member in the session room, open a bottom sheet that prominently shows the full payment link, a large **Copy** button, and a **Share** button (native Web Share API). Optionally render a QR code using the `qrcode` npm package.  
**Files to touch:**
- `apps/web/components/app/session/MemberStatusList.tsx` — replace the raw copy icon with a button that opens the sheet
- `apps/web/components/app/session/LinkSheet.tsx` ← new file

---

### 3. Member Nicknames / Address Book ✅ DONE
**What:** Let the host (and any user) save a human-readable name for a wallet address (`0x1a2b…` → "Alice"). Names are stored in `localStorage`. They appear everywhere an address is shortened: session room, member list, split screen.  
**Files to touch:**
- `apps/web/lib/contacts.ts` ← new file (get/set/list contact names in localStorage)
- `apps/web/components/app/session/MemberStatusList.tsx` — show name if available, inline edit (pencil icon)
- `apps/web/components/app/members/MembersEditor.tsx` — show name below address in the member list
- `apps/web/components/app/split/SplitEditor.tsx` — show name in per-member breakdown

---

### 4. Terms of Service Page ✅ DONE
**Delivered across 28 commits:**
- `apps/web/app/(marketing)/terms/page.tsx` — whitespace-pre-line body text, section ids for deep-linking, SectionAnchor on each heading, two-column layout with sticky ToC on desktop, mobile JumpToDropdown, ReadingProgress bar, BackToTop button, section count + reading time in header, last-updated pill badge, hover highlights, divide-y section separators, semantic `<main>`, print-friendly styles, OpenGraph + Twitter card metadata
- `apps/web/app/(marketing)/privacy/page.tsx` — full parity: section ids, SectionAnchor, sticky ToC, mobile JumpToDropdown, ReadingProgress, BackToTop, hover highlights, semantic `<main>`, print styles, OG metadata
- `apps/web/lib/terms-sections.ts` ← new file (section data + `estimateReadingTime`)
- `apps/web/components/legal/SectionAnchor.tsx` ← new file
- `apps/web/components/legal/TableOfContents.tsx` ← new file (IntersectionObserver scroll-spy)
- `apps/web/components/legal/BackToTop.tsx` ← new file
- `apps/web/components/legal/JumpToDropdown.tsx` ← new file
- `apps/web/components/legal/ReadingProgress.tsx` ← new file
- `apps/web/components/shadcn-space/blocks/footer-01/footer.tsx` — legal links upgraded to Next.js `<Link>`

---

## Tier 2 — Polish

### 5. Re-scan / Switch Photo in Review
**What:** Add a small **"Re-scan"** button on the review page header. Clicking it opens an `ImagePicker` inline; selecting a new image re-calls `parseReceipt` and replaces the receipt while keeping members and mode intact.  
**Files to touch:**
- `apps/web/app/app/review/[draftId]/page.tsx`

---

### 6. Session Status Filtering on History
**What:** Add a segmented filter control to the history page: **All · Open · Settled · Expired**. Filtering is purely client-side.  
**Logic:**
- Open: `!closeTxHash && expiresAt > Date.now()`
- Settled: `Boolean(closeTxHash)`
- Expired: `expiresAt < Date.now() && !closeTxHash`  

**Files to touch:**
- `apps/web/app/app/history/page.tsx` — add filter state + UI
- `apps/web/components/app/home/SessionList.tsx` — accept optional `filter` prop

---

### 7. Expiry Warning Banner
**What:** When a session has less than 10 minutes remaining, show a pulsing amber banner: *"Session closes in 8m 32s — share payment links now."* Show it in both the session room and the pay page.  
**Files to touch:**
- `apps/web/components/app/common/ExpiryBanner.tsx` ← new file
- `apps/web/app/app/session/[id]/page.tsx`
- `apps/web/app/app/pay/[id]/[member]/page.tsx`

---

### 8. Shareable Session Summary
**What:** After a session is settled, show a **"Share summary"** button. It generates a receipt-style text block and opens the native share sheet with it. Example:
```
Splyt · $48.00
4 members · all paid ✓
Settled on Celo
```
**Files to touch:**
- `apps/web/app/app/session/[id]/page.tsx` — add Share Summary button in the settled state

---

## Tier 3 — New Features

### 9. Manual / Typed Receipt Entry
**What:** Add an **"Enter manually"** button on the scan page. Clicking it creates a blank draft (one empty item row, zero totals) and routes directly to `/app/review/[draftId]`, bypassing the AI parse entirely.  
**Files to touch:**
- `apps/web/app/app/scan/page.tsx`

---

### 10. Nudge (Payment Reminder Share)
**What:** Add a **"Nudge"** button next to each unpaid member in the session room. Clicking it opens the native share sheet with a pre-composed message:  
*"Hey! Your share for this Splyt is $12.50 — link expires soon: [pay link]"*  
**Files to touch:**
- `apps/web/components/app/session/MemberStatusList.tsx`

---

### 11. Split Templates
**What:** After successfully creating a session, offer **"Save as template"**. A template stores the member list + split mode (no amounts/receipt). On the home screen a **"From template"** CTA lets the user pick a template to pre-fill members after scanning a receipt.  
**Files to touch:**
- `apps/web/lib/templates.ts` ← new file (IndexedDB store: `templates`)
- `apps/web/components/app/split/CreateSheet.tsx` — add "Save template" option after success
- `apps/web/app/app/scan/page.tsx` — add "Use template" button
- `apps/web/components/app/home/TemplateList.tsx` ← new file

---

### 12. Longer Expiry Options (24 h, 72 h)
**What:** Add **24 h** and **72 h** options to the expiry selector. Requires relaxing the backend Zod cap from 240 min (4 h) to 10 080 min (7 days). No contract change needed.  
**Files to touch:**
- `apps/web/components/app/split/SplitEditor.tsx` — add expiry options
- `apps/backend/src/routes/session.ts` — change Zod `.max(240)` → `.max(10_080)`

---

### 13. Paginated Session List
**What:** `GET /api/session` currently returns all sessions. Add cursor-based pagination (`?limit=20&before=<timestamp>`) on the backend and infinite-scroll on the frontend.  
**Files to touch:**
- `apps/backend/src/routes/session.ts` — add `limit` + `before` query params
- `apps/backend/src/services/db.ts` — paginate the MongoDB query
- `apps/web/lib/api.ts` — update `listSessions()` signature
- `apps/web/components/app/home/SessionList.tsx` — Intersection Observer for next-page load
