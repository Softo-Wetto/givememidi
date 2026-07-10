# GiveMeMIDI Import Inbox Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/admin/imports` as a focused tabbed workspace with safe individual and bulk queue deletion.

**Architecture:** Extract pure queue behavior into a tested helper module, add admin-only DELETE handlers beside the existing import routes, then split the 606-line client into a small tab shell plus focused queue and source panels. Keep the existing bulk publisher but restyle its outer shell for the new workspace.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, PocketBase REST API, Lucide icons, Node 23 built-in test runner.

## Global Constraints

- Deleting an import job must never delete `music_files` records or uploaded MIDI/PDF files.
- Bulk deletion accepts only explicit IDs and at most 200 unique IDs.
- Imported jobs remain deletable but require stronger confirmation copy.
- Only authenticated GiveMeMIDI administrators may read, update, or delete import jobs.
- Keep worker unavailability isolated from queue review and cleanup.
- Preserve responsive mobile behavior and respect reduced-motion preferences.
- Do not add a new runtime dependency.

---

### Task 1: Tested Queue Domain Helpers

**Files:**
- Create: `src/lib/import-queue.ts`
- Create: `src/lib/import-queue.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `filterImportJobs(jobs, query, status)`, `selectedVisibleIds(jobs, selectedIds)`, `containsImportedJobs(jobs, ids)`, `reconcileDeletedJobs(jobs, selectedIds, result)`, and `validateImportJobIds(value, max)`.
- Consumes: structural queue fields only; the helper must not import React or PocketBase clients.

- [ ] **Step 1: Add the Node test command and failing helper tests**

Add `"test": "node --test --experimental-strip-types src/lib/import-queue.test.ts"` to `package.json`. Create tests using `node:test` and `node:assert/strict` that assert:

```ts
assert.deepEqual(filterImportJobs(jobs, "bach", "error").map((job) => job.id), ["bbbbbbbbbbbbbbb"]);
assert.deepEqual(selectedVisibleIds(jobs.slice(0, 2), new Set(["aaaaaaaaaaaaaaa", "ccccccccccccccc"])), ["aaaaaaaaaaaaaaa"]);
assert.equal(containsImportedJobs(jobs, ["ccccccccccccccc"]), true);
assert.deepEqual(validateImportJobIds({ ids: ["aaaaaaaaaaaaaaa", "aaaaaaaaaaaaaaa"] }), { ids: ["aaaaaaaaaaaaaaa"] });
assert.deepEqual(validateImportJobIds({ ids: [] }), { error: "Select at least one import job." });
assert.deepEqual(reconcileDeletedJobs(jobs, new Set(["aaaaaaaaaaaaaaa", "bbbbbbbbbbbbbbb"]), {
  deletedIds: ["aaaaaaaaaaaaaaa"],
  failures: [{ id: "bbbbbbbbbbbbbbb", error: "Denied" }],
}), {
  jobs: jobs.filter((job) => job.id !== "aaaaaaaaaaaaaaa"),
  selectedIds: new Set(["bbbbbbbbbbbbbbb"]),
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm.cmd test`

Expected: FAIL because `src/lib/import-queue.ts` does not exist.

- [ ] **Step 3: Implement the pure helper module**

Define structural types and deterministic functions. Validation must require an object containing an array, trim and deduplicate IDs, enforce `/^[a-zA-Z0-9]{15}$/`, and reject more than 200 IDs. `filterImportJobs` must search title, composer, source URL, license, genre, and status case-insensitively. `reconcileDeletedJobs` must remove only `deletedIds` and retain failed IDs in selection.

- [ ] **Step 4: Run the tests and verify GREEN**

Run: `npm.cmd test`

Expected: all import queue helper tests PASS.

- [ ] **Step 5: Commit the helper slice**

```bash
git add package.json src/lib/import-queue.ts src/lib/import-queue.test.ts
git commit -m "test: cover import queue behavior"
```

### Task 2: Admin-Only Queue Deletion API

**Files:**
- Modify: `src/app/api/import/jobs/route.ts`
- Modify: `src/app/api/import/jobs/[id]/route.ts`
- Test: `src/lib/import-queue.test.ts`

**Interfaces:**
- Consumes: `validateImportJobIds(value, 200)` from Task 1.
- Produces: `DELETE /api/import/jobs` returning `{ deletedIds: string[]; failures: Array<{ id: string; error: string }> }` and `DELETE /api/import/jobs/[id]` returning `{ deletedId: string }`.

- [ ] **Step 1: Add failing validation boundary tests**

Add assertions for malformed IDs, non-array payloads, and a 201-ID payload:

```ts
assert.deepEqual(validateImportJobIds({ ids: ["bad id"] }), { error: "One or more import job IDs are invalid." });
assert.deepEqual(validateImportJobIds({ ids: "aaaaaaaaaaaaaaa" }), { error: "Import job IDs must be provided as an array." });
assert.deepEqual(validateImportJobIds({ ids: Array.from({ length: 201 }, (_, index) => index.toString(36).padStart(15, "0").slice(-15)) }), { error: "You can delete at most 200 import jobs at once." });
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npm.cmd test`

Expected: FAIL on at least one new validation assertion.

- [ ] **Step 3: Complete validation and add the bulk DELETE route**

In `jobs/route.ts`, parse JSON, validate IDs, then call:

```ts
await pbRequest<void>(`/api/collections/import_jobs/records/${id}`, {
  method: "DELETE",
  token: auth.token,
});
```

for each validated ID with `Promise.allSettled`. Return all confirmed `deletedIds` and safe failure messages. Return 502 only when every deletion fails; return 200 for complete or partial success. Reuse the refreshed auth cookie on every response.

- [ ] **Step 4: Add the individual DELETE route**

In `[id]/route.ts`, validate `{ ids: [id] }`, delete exactly that import record with the same admin guard, and return `{ deletedId: id }`. Do not query or mutate `music_files`.

- [ ] **Step 5: Run tests and type-check through the production compiler**

Run: `npm.cmd test`

Run: `npx.cmd tsc --noEmit`

Expected: tests PASS and TypeScript exits 0.

- [ ] **Step 6: Commit the API slice**

```bash
git add src/lib/import-queue.test.ts src/app/api/import/jobs/route.ts src/app/api/import/jobs/[id]/route.ts
git commit -m "feat: delete import queue records"
```

### Task 3: Focused Queue Panel

**Files:**
- Create: `src/app/admin/imports/import-api.ts`
- Create: `src/app/admin/imports/ConfirmImportDeleteDialog.tsx`
- Create: `src/app/admin/imports/ImportQueuePanel.tsx`
- Modify: `src/app/admin/imports/ImportInboxClient.tsx`
- Test: `src/lib/import-queue.test.ts`

**Interfaces:**
- Consumes: Task 1 queue helpers and Task 2 DELETE endpoints.
- Produces: `ImportQueuePanel({ active, onMessage, onError })` and `importApi<T>(url, init)`.

- [ ] **Step 1: Add failing selection/filter interaction tests**

Extend helper tests to prove a status-filtered select-all returns only visible IDs and deleting one successful ID does not clear a failed selected ID.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test`

Expected: FAIL until selection/reconciliation behavior covers the new cases.

- [ ] **Step 3: Extract the shared API client**

Move the current JSON fetch/error handling into `import-api.ts`:

```ts
export async function importApi<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.error || `Import request failed (${response.status}).`);
  return body as T;
}
```

- [ ] **Step 4: Build the accessible confirmation dialog**

The dialog receives `open`, `count`, `containsImported`, `busy`, `onCancel`, and `onConfirm`. It must use `role="alertdialog"`, close on Escape when idle, restore focus through the triggering button's normal React flow, and display the imported-history warning: “Published MIDI files will remain in the library; only this import history will be removed.”

- [ ] **Step 5: Build the queue panel**

Move queue loading, stats, search, status filter, selection, status mutation, worker start/status, row expansion, and deletion into `ImportQueuePanel.tsx`. Use a stable toolbar, compact metrics, desktop table headings, mobile labels, and explicit action labels. Implement:

```ts
requestDelete(ids, label)
confirmDelete()
deleteSelected()
deleteStatus("error" | "skipped" | "imported")
toggleVisibleSelection()
```

`confirmDelete` sends `{ ids }` to `DELETE /api/import/jobs`, applies `reconcileDeletedJobs`, reports partial failures, and never removes failed IDs from the page. Worker logs render inside a collapsed `<details>` block.

- [ ] **Step 6: Replace the inbox body with a small tab shell**

`ImportInboxClient.tsx` owns `"queue" | "bulk" | "sources"`, renders a compact admin title row, tab buttons with icons and active states, shared notices, and only the active panel. The default tab is Queue. Remove the oversized hero and simultaneous workflow stack.

- [ ] **Step 7: Run tests and type-check**

Run: `npm.cmd test`

Run: `npx.cmd tsc --noEmit`

Expected: tests PASS and TypeScript exits 0.

- [ ] **Step 8: Commit the queue UI slice**

```bash
git add src/app/admin/imports/import-api.ts src/app/admin/imports/ConfirmImportDeleteDialog.tsx src/app/admin/imports/ImportQueuePanel.tsx src/app/admin/imports/ImportInboxClient.tsx src/lib/import-queue.test.ts
git commit -m "feat: rebuild import queue workspace"
```

### Task 4: Source And Bulk Workflow Cleanup

**Files:**
- Create: `src/app/admin/imports/ImportSourcePanel.tsx`
- Modify: `src/app/admin/imports/ImportInboxClient.tsx`
- Modify: `src/app/admin/imports/BulkFileImportClient.tsx`

**Interfaces:**
- Consumes: `importApi` from Task 3.
- Produces: `ImportSourcePanel({ onMessage, onError, onQueued })` and an embedded bulk uploader matching the tab workspace.

- [ ] **Step 1: Extract source queueing into its own panel**

Move URL parsing, deduplication, score discovery, queue creation, and manual draft creation into `ImportSourcePanel.tsx`. The primary URL panel appears first. Manual draft is inside a closed-by-default `<details>` region. Keep direct URL queueing available when discovery fails.

- [ ] **Step 2: Simplify the bulk uploader presentation**

Remove its internal promotional hero, decorative top gradient, repeated large heading, and nested oversized cards. Keep drag/drop, file pairing, defaults, editable rows, publish-selected, per-row removal, progress states, and imported-row cleanup. Use one unframed two-column workspace within the tab and 8px-or-smaller control radii where practical.

- [ ] **Step 3: Wire refresh after source queueing**

Increment a `queueRevision` value in `ImportInboxClient` after successful source creation and pass it to `ImportQueuePanel`. The queue panel reloads when active and when `queueRevision` changes, without clearing active filters.

- [ ] **Step 4: Run tests, lint, and type-check**

Run: `npm.cmd test`

Run: `npm.cmd run lint`

Run: `npx.cmd tsc --noEmit`

Expected: all commands exit 0 with no new warnings.

- [ ] **Step 5: Commit the workflow cleanup**

```bash
git add src/app/admin/imports/ImportSourcePanel.tsx src/app/admin/imports/ImportInboxClient.tsx src/app/admin/imports/BulkFileImportClient.tsx
git commit -m "refactor: simplify import source workflows"
```

### Task 5: Production And Responsive Verification

**Files:**
- Modify only files already in scope if verification exposes a defect.

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a deployable Next.js/OpenNext build.

- [ ] **Step 1: Run the full automated verification**

Run: `npm.cmd test`

Run: `npm.cmd run lint`

Run: `npm.cmd run build`

Expected: tests, ESLint, Next.js compilation, and OpenNext Cloudflare packaging all complete successfully.

- [ ] **Step 2: Start the local app**

Run: `npm.cmd run dev`

Expected: the app starts on an available localhost port and `/admin/imports` redirects unauthenticated requests to login without server errors.

- [ ] **Step 3: Check responsive states**

Verify desktop and mobile widths for the Queue default, empty queue, filtered queue, expanded editor, standard delete confirmation, imported-history confirmation, Bulk Upload tab, and Add Sources tab. Confirm no horizontal overflow, clipped controls, overlapping text, or layout shifts.

- [ ] **Step 4: Verify destructive semantics**

Using test queue data, delete a pending job and imported-history job. Confirm the queue records disappear only after success and the imported job's associated `music_files` record remains present.

- [ ] **Step 5: Commit any verification fixes**

```bash
git add src/app/admin/imports src/app/api/import/jobs src/lib/import-queue.ts src/lib/import-queue.test.ts package.json
git commit -m "fix: polish import inbox verification issues"
```
