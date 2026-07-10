# GiveMeMIDI Import Inbox Rework

## Objective

Turn the admin import inbox into a focused operational workspace. Queue review and cleanup should be fast, bulk file publishing should remain powerful without dominating the page, and deleting queue history must never delete a published MIDI record.

## Scope

This change covers the `/admin/imports` interface, its queue-management API, and focused tests for queue behavior. Shared visual changes are limited to patterns used by this admin page. Unrelated public pages and the import worker's download behavior are outside this change.

## Information Architecture

The page uses three tabs:

1. **Queue** is the default tab. It contains queue metrics, worker status, search, status filters, selection, bulk actions, and expandable row editing.
2. **Bulk Upload** contains the existing local MIDI/PDF pairing and direct publishing workflow.
3. **Add Sources** contains URL queueing and a collapsed manual-draft form.

The existing oversized promotional hero, decorative glow, repeated metrics, repeated notice blocks, permanently expanded worker logs, and simultaneous display of every workflow are removed.

## Queue Experience

The queue is presented as a dense responsive table on desktop and a compact list on narrow screens. Each record shows selection, status, title, composer, source, last update, and an actions menu. Metadata editing expands beneath the selected row.

The toolbar provides:

- Search across title, composer, source URL, license, and status.
- Status filters for all, pending, ready, importing, imported, skipped, and error.
- Select all visible records and clear selection.
- Bulk mark ready and bulk skip.
- Bulk delete selected records.
- Cleanup shortcuts for failed, skipped, and imported history.
- Refresh queue and run worker actions.

Queue counts are calculated from all loaded records and update immediately after successful operations. Filtered and selected counts remain visible so bulk action scope is unambiguous.

## Deletion Semantics

All import job records may be deleted by an authenticated GiveMeMIDI administrator.

- Deleting pending, ready, importing, skipped, or error jobs requires a standard confirmation.
- Deleting one or more imported jobs requires a stronger confirmation stating that only import history will be removed.
- Deleting an import job never deletes its related `music_files` record or uploaded MIDI/PDF files.
- Bulk deletion accepts explicit record IDs only. It does not accept a server-side status wildcard, preventing stale filters from deleting unseen records.
- The API rejects empty requests, malformed IDs, oversized batches, unauthenticated users, and non-admin users.
- Partial failures return the IDs that were deleted and a failure entry for every record that could not be removed. The UI removes only confirmed successful IDs and keeps failed rows visible.

Cleanup shortcuts first resolve the currently loaded matching records into explicit IDs, show the matching count, and use the same bulk-delete endpoint and confirmation flow.

## API Design

`DELETE /api/import/jobs/[id]` removes one import job after refreshing and validating admin authentication.

`DELETE /api/import/jobs` accepts `{ "ids": string[] }`, validates a maximum of 200 unique PocketBase record IDs, deletes each requested record, and returns `{ deletedIds, failures }`. A complete success returns HTTP 200. A partial success also returns HTTP 200 with failures for the UI to report. If no record can be deleted, the endpoint returns an error response.

Authentication and error formatting reuse the existing import route behavior. PocketBase errors are logged server-side with useful context while API responses expose safe, specific messages.

## Component Boundaries

- `ImportInboxClient` owns active-tab state and shared success/error notices.
- `ImportQueuePanel` owns queue loading, filtering, selection, status updates, worker controls, deletion confirmation, and row expansion.
- `ImportSourcePanel` owns URL parsing, discovery, queue creation, and manual draft creation.
- `BulkFileImportClient` retains file pairing and publishing, with its outer presentation simplified to fit the tab.
- Pure queue helpers own filter matching, selection resolution, imported-record detection, and delete-result reconciliation so these behaviors can be tested independently.
- A reusable confirmation dialog provides focus-safe confirmation for destructive actions and clearly distinguishes normal cleanup from imported-history cleanup.

## Error Handling

Actions have independent busy states so refreshing the queue does not disable unrelated controls. Errors appear beside the affected workspace and are not erased by unrelated successful actions. Destructive buttons remain disabled when there is no valid target.

Worker status is summarized in the Queue toolbar. Detailed logs are collapsed by default and can be expanded or refreshed. An unavailable worker does not prevent queue review, editing, or deletion.

## Visual Direction

The page follows GiveMeMIDI's dark music-focused interface with restrained cyan and indigo accents. It uses tighter headings, square-ish panels with no nested decorative cards, compact icon buttons with tooltips where appropriate, clear tab and status states, and subtle opacity/position transitions. Motion respects reduced-motion preferences. Stable row and control dimensions prevent layout shifts.

## Testing And Verification

Automated tests cover:

- Queue filtering and visible selection behavior.
- Detection of imported jobs in a delete set.
- Reconciliation of complete and partial bulk-delete results.
- Delete payload validation and uniqueness limits.
- Admin authorization and PocketBase deletion outcomes at the route boundary where practical.

Verification also includes lint, production build, and desktop/mobile visual checks of the default queue, empty state, filtered state, expanded edit state, confirmation dialog, and bulk-upload tab.

## Success Criteria

- The default view makes queue state and next actions immediately understandable.
- Admins can delete one record, selected records, failed jobs, skipped jobs, or imported history.
- Imported-history deletion cannot remove published library content.
- Bulk upload and source queueing remain available without crowding the default view.
- Errors are actionable and no failed deletion silently disappears from the UI.
- The page is usable without horizontal overflow on mobile and matches the shared GiveMeMIDI design language.
