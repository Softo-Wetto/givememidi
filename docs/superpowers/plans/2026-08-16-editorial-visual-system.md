# GiveMeMIDI Editorial Visual System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild GiveMeMIDI's user-facing interface around a bold, music-led editorial system while preserving every existing backend, authentication, preview, download, upload, and import workflow.

**Architecture:** Add a small set of testable presentation helpers and reusable editorial layout components, then migrate shared chrome and route surfaces onto those primitives. Keep server data fetching and client interaction boundaries unchanged; operational routes receive the same tokens and shell with denser layouts.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Framer Motion, Lucide React, Node test runner, PocketBase compatibility client.

## Global Constraints

- Keep the near-black, blue, cyan, and indigo palette.
- New cards and panels use a maximum `8px` border radius.
- Do not change backend collections, authentication rules, download permissions, import behavior, or public URLs.
- All nonessential motion must stop under `prefers-reduced-motion: reduce`.
- Preserve readable contrast, visible focus states, and usable layouts from `320px` through wide desktop.
- Public pages may be expressive; upload, account, and administration pages remain compact and practical.

---

### Task 1: Editorial Presentation Foundation

**Files:**
- Create: `src/lib/editorial-ui.ts`
- Create: `src/lib/editorial-ui.test.ts`
- Create: `src/app/components/EditorialSection.tsx`
- Modify: `src/app/globals.css`
- Modify: `package.json`

**Interfaces:**
- Produces: `artworkVariant(seed: string): 0 | 1 | 2 | 3`, `formatMetric(value: number): string`, `EditorialSection`, `EditorialHeading`, and shared `.gmm-*` CSS primitives.
- Consumes: existing Tailwind utilities and React children.

- [ ] **Step 1: Write failing tests for deterministic artwork variants and compact metrics**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { artworkVariant, formatMetric } from "./editorial-ui.ts";

test("artwork variants are deterministic and bounded", () => {
  assert.equal(artworkVariant("same-id"), artworkVariant("same-id"));
  assert.ok([0, 1, 2, 3].includes(artworkVariant("another-id")));
});

test("metrics remain readable", () => {
  assert.equal(formatMetric(950), "950");
  assert.equal(formatMetric(1250), "1.3K");
  assert.equal(formatMetric(1_250_000), "1.3M");
});
```

- [ ] **Step 2: Run `node --no-warnings --test --experimental-strip-types src/lib/editorial-ui.test.ts` and confirm it fails because the module is missing**
- [ ] **Step 3: Implement the pure helpers and focused editorial section components**

```ts
export function artworkVariant(seed: string): 0 | 1 | 2 | 3 {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return (hash % 4) as 0 | 1 | 2 | 3;
}

export function formatMetric(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) return `${(value / 1000).toFixed(1).replace(".0", "")}K`;
  return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
}
```

- [ ] **Step 4: Add `.gmm-shell`, `.gmm-band`, `.gmm-kicker`, `.gmm-display`, `.gmm-panel`, `.gmm-rule`, `.gmm-ticker`, focus, reveal, and reduced-motion styles to `globals.css`**
- [ ] **Step 5: Add the editorial test to the existing `test` script and run `npm test`**
- [ ] **Step 6: Commit with `git commit -m "feat: add editorial UI foundation"`**

### Task 2: Shared Header And Footer

**Files:**
- Create: `src/app/components/HeaderSearch.tsx`
- Create: `src/app/components/HeaderAccount.tsx`
- Modify: `src/app/components/Header.tsx`
- Modify: `src/app/components/Footer.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Consumes: `useAuth`, `ProfileAvatar`, PocketBase search compatibility methods, existing routes.
- Produces: a slim sticky header with desktop/mobile navigation, search suggestions, upload routing, and account controls; a flat editorial footer.

- [ ] **Step 1: Extract search state and suggestion rendering from `Header.tsx` into `HeaderSearch` without changing query behavior**
- [ ] **Step 2: Extract authenticated profile links and sign-out behavior into `HeaderAccount`**
- [ ] **Step 3: Recompose `Header.tsx` as a compact navigation rail with Home, Library, Creators, Awards, search, Upload, and account actions**
- [ ] **Step 4: Preserve mobile navigation, admin Import Inbox access, `/` shortcut search focus, and login redirects**
- [ ] **Step 5: Rebuild `Footer.tsx` as a full-width link index with a large GiveMeMIDI signature and a single creator CTA**
- [ ] **Step 6: Run `npm run lint` and manually inspect all header links in desktop and mobile widths**
- [ ] **Step 7: Commit with `git commit -m "feat: rebuild shared site navigation"`**

### Task 3: Original Hero Asset And Homepage

**Files:**
- Create: `public/givememidi-editorial-hero.png`
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing home-page PocketBase queries, `EditorialSection`, `EditorialHeading`, `MidiCard`, `MidiRowScroller`, and `formatMetric`.
- Produces: the redesigned homepage with live metrics, ticker, discovery rows, creator-reward band, and collection CTA.

- [ ] **Step 1: Generate an original landscape bitmap showing close, tactile sheet music and a modern MIDI controller in dramatic cool-blue studio light, with no text or logos**
- [ ] **Step 2: Replace the gradient-blob hero with an image-led two-column composition headed `Find your next MIDI`**
- [ ] **Step 3: Add the scrolling capability/genre ticker and a hard-edged metric strip using live upload, PDF, download, and rating data already available to the page**
- [ ] **Step 4: Convert popular, latest, top-rated, and PDF sections to editorial headings and consistent spacing while preserving empty states**
- [ ] **Step 5: Replace nested promotional cards with full-width creator-reward and collection bands**
- [ ] **Step 6: Run `npm run lint` and verify the hero leaves the next band visible at 390x844 and 1440x900**
- [ ] **Step 7: Commit with `git commit -m "feat: redesign GiveMeMIDI homepage"`**

### Task 4: MIDI Cards, Scroller, And Catalog

**Files:**
- Modify: `src/app/components/MidiCard.tsx`
- Modify: `src/app/components/MidiRowScroller.tsx`
- Modify: `src/app/midi/AllMidiClientPage.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `artworkVariant`, existing MIDI metadata, bookmark/auth behavior, and query-string filters.
- Produces: deterministic card-art variants, reliable full-card links, accessible drag scrolling, and an editorial catalog layout.

- [ ] **Step 1: Route card artwork selection through `artworkVariant(id)` and define four consistent score-document compositions**
- [ ] **Step 2: Flatten card styling to an 8px radius, strengthen metadata hierarchy, and retain duration, date, rating, downloads, BPM, genre, and PDF state**
- [ ] **Step 3: Keep bookmark controls isolated from the full-card link and preserve keyboard activation**
- [ ] **Step 4: Restyle scroller controls so arrows never overlap card titles; retain mouse-drag and touch scrolling**
- [ ] **Step 5: Recompose `AllMidiClientPage` with a strong index heading, visible result count, compact search/filter controls, and responsive grid/list rhythm**
- [ ] **Step 6: Run `npm run lint`, test card links and bookmarks, and check 320px overflow**
- [ ] **Step 7: Commit with `git commit -m "feat: refresh MIDI discovery surfaces"`**

### Task 5: MIDI Detail Experience

**Files:**
- Modify: `src/app/midi/[id]/page.tsx`
- Modify: `src/app/components/MidiPreview.tsx`
- Modify: `src/app/components/PdfPreview.tsx`
- Modify: `src/app/components/CommentsSection.tsx`
- Modify: `src/app/components/MidiActions.tsx`

**Interfaces:**
- Consumes: existing MIDI, uploader, rating, bookmark, comment, preview, and authenticated-download data flows.
- Produces: a wide editorial detail page with readable hero art, structured facts, previews, comments, and related actions.

- [ ] **Step 1: Recompose the page hero into an image-backed title area with a dark readability layer and bright, independent controls**
- [ ] **Step 2: Present composer, creator, rank, genre, BPM, duration, date, downloads, and rating as a compact information rail**
- [ ] **Step 3: Restyle MIDI and PDF previews as full-width tools with clear controls, loading, empty, and error states**
- [ ] **Step 4: Restyle comments into a readable threaded discussion while preserving reply submission and avatar behavior**
- [ ] **Step 5: Confirm logged-out download actions route to login and logged-in actions preserve current authorization behavior**
- [ ] **Step 6: Run `npm test`, `npm run lint`, and exercise one MIDI-only and one MIDI+PDF record**
- [ ] **Step 7: Commit with `git commit -m "feat: rebuild MIDI detail experience"`**

### Task 6: Public Community And Information Pages

**Files:**
- Modify: `src/app/creators/page.tsx`
- Modify: `src/app/awards/page.tsx`
- Modify: `src/app/bookmarks/page.tsx`
- Modify: `src/app/connections/page.tsx`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/app/u/[id]/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `src/app/contact/page.tsx`
- Modify: `src/app/privacy/page.tsx`
- Modify: `src/app/terms/page.tsx`

**Interfaces:**
- Consumes: existing page queries and mutations plus shared editorial primitives.
- Produces: a consistent family of rank, library, profile, social, information, and legal pages.

- [ ] **Step 1: Convert creators and awards to ranked editorial lists with visible milestones and contribution data**
- [ ] **Step 2: Convert bookmarks and connections to library/index layouts with useful result counts, filters, and empty states**
- [ ] **Step 3: Apply the identity-led profile composition to private and public profiles without changing profile mutations**
- [ ] **Step 4: Recompose About and Contact into full-width narrative bands; preserve contact submission and validation**
- [ ] **Step 5: Recompose Privacy and Terms with sticky section navigation on desktop and readable document widths**
- [ ] **Step 6: Run `npm run lint` and exercise every route logged out and logged in where applicable**
- [ ] **Step 7: Commit with `git commit -m "feat: unify community and information pages"`**

### Task 7: Operational Pages And Final Verification

**Files:**
- Modify: `src/app/upload/UploadClient.tsx`
- Modify: `src/app/myuploads/page.tsx`
- Modify: `src/app/login/LoginClient.tsx`
- Modify: `src/app/reset-password/page.tsx`
- Modify: `src/app/midi/[id]/edit/page.tsx`
- Modify: `src/app/admin/imports/ImportInboxClient.tsx`
- Modify: `src/app/admin/imports/BulkFileImportClient.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: existing forms, mutations, file previews, import queue controls, and shared tokens.
- Produces: denser operational screens visually aligned with the new public site.

- [ ] **Step 1: Apply compact editorial headers, 8px panels, consistent fields, and strong validation states to upload and edit workflows**
- [ ] **Step 2: Align login, reset password, and personal uploads with the shared type and control system**
- [ ] **Step 3: Align Import Inbox and bulk import panels without changing queue APIs, selection, deletion, or worker behavior**
- [ ] **Step 4: Run `npm test` and expect all editorial and import queue tests to pass**
- [ ] **Step 5: Run `npm run lint` and resolve all introduced errors without suppressing rules**
- [ ] **Step 6: Run `npm run build` and confirm the Next.js production build succeeds**
- [ ] **Step 7: Start `npm run dev`, verify `/`, `/midi`, a MIDI detail route, `/creators`, `/awards`, `/bookmarks`, `/profile`, `/upload`, `/contact`, and `/admin/imports` at desktop and mobile widths, and check console/network errors**
- [ ] **Step 8: Commit with `git commit -m "feat: complete editorial GiveMeMIDI redesign"`**

