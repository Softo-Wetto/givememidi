# GiveMeMIDI Editorial Visual System

## Goal

Rework GiveMeMIDI into a bold, music-led editorial experience inspired by the pacing and confidence of the supplied reference while retaining GiveMeMIDI's black, blue, cyan, and indigo identity. Public discovery pages should feel expressive and memorable; upload, account, and administration workflows should remain compact and practical.

## Scope

This redesign covers the shared header, footer, typography, layout primitives, motion, homepage, MIDI catalog and detail pages, creators, awards, bookmarks, profiles, connections, about, contact, privacy, and terms. Upload, account settings, personal uploads, and import administration inherit the shared system but use quieter compositions suited to repeated work.

No backend collections, authentication rules, download permissions, import behavior, or public URLs will change. Existing user-facing features remain available.

## Visual Direction

- Keep a near-black base with blue, cyan, and indigo accents. Use white and cool gray for hierarchy, with amber, green, and red reserved for semantic states.
- Replace decorative gradient blobs and excessive glass cards with full-width bands, strong divider lines, flat surfaces, large type, and intentional negative space.
- Use square or lightly rounded controls and panels, with an 8px maximum radius for new cards.
- Introduce oversized display copy as a structural element, compact uppercase labels, large index numbers, and denser metadata typography.
- Use one original music-focused raster hero visual with readable contrast. Existing MIDI/PDF artwork remains the basis of library cards.

## Shared Shell

The header becomes a slim editorial navigation bar with a stronger wordmark, clear library and creator destinations, a prominent search control, an upload command, and compact account access. Desktop navigation stays visible; mobile navigation uses a purposeful drawer with the same destinations and account actions.

The footer becomes a flatter, high-contrast index with a large GiveMeMIDI signature, grouped navigation, legal/support links, and a concise creator call to action. It will avoid nested cards and decorative glow effects.

Shared CSS tokens will define widths, section spacing, surfaces, borders, focus states, typography, and motion. Existing route-specific styles can migrate incrementally without breaking pages that are not yet converted.

## Homepage

The first viewport presents a literal library offer, "Find your next MIDI," in oversized type alongside an original score-focused image. Search and browse are the primary actions; upload is secondary. The hero leaves the next content band visible on common desktop and mobile viewports.

Below the hero:

1. A horizontal ticker communicates library capabilities and genres.
2. A hard-edged metric strip summarizes uploads, sheet music, downloads, and creator activity using live data already fetched by the page.
3. Popular, latest, highest-rated, and sheet-music collections use cleaner editorial headings and the existing horizontal scrollers.
4. Creator rewards become a full-width information band rather than a floating promotional card.
5. A final collection/upload call to action closes the page without adding a marketing-style card.

## Library Components

MIDI cards retain title, composer, genre, rating, downloads, tempo, duration, PDF availability, and upload date. Their visual treatment becomes flatter and sharper, with several deterministic artwork variants for visual rhythm. The entire card remains a reliable link. Hover motion is limited to image movement, border emphasis, and directional icon movement.

Catalog pages use stronger list/grid controls, visible result counts, clear filters, and editorial section headers. MIDI detail pages use a wide hero with readable artwork treatment, creator identity, description, file facts, preview controls, sheet music, comments, related content, and authentication-aware download actions.

## Supporting Pages

- Creators and awards use ranked editorial lists, milestone markers, and clear progress data.
- Bookmarks and personal uploads use library-oriented organization, useful empty states, and compact management actions.
- Profiles and connections emphasize identity, rank, contribution activity, and social relationships.
- About, contact, privacy, and terms use the same typography and section rhythm without pretending to be product dashboards.
- Upload, login, settings, and import administration use restrained panels, concise help, strong validation states, and no oversized decorative content.

## Motion And Accessibility

Motion consists of masked image reveals, staggered section entrances, a slow ticker, active-navigation transitions, and small hover responses. It must never block input or navigation. `prefers-reduced-motion` disables nonessential movement. Focus rings remain visible, controls have accessible names, text contrast meets WCAG AA, and layouts avoid clipping or overlap from 320px mobile widths through wide desktop.

## Architecture

The implementation will introduce small shared presentation primitives for editorial headings, section bands, metric strips, and calls to action instead of duplicating large Tailwind class strings. Existing data fetching stays server-side where it is today. Client components remain responsible only for authentication state, menus, search suggestions, previews, and interactive controls.

The rollout order is shared tokens and shell, homepage, reusable MIDI card/scroller, MIDI catalog/detail pages, supporting public pages, then operational pages. This keeps the app usable throughout the refactor and limits behavioral risk.

## Error Handling

Existing loading, empty, authentication, and backend-error paths remain functional. Redesigned surfaces must show explicit empty and error states instead of collapsing sections. Search and account dropdowns close predictably after navigation, and failed interactive requests keep the current page usable.

## Verification

- Run focused tests for any changed behavior and preserve the existing import queue tests.
- Run ESLint and the production Next.js build.
- Exercise navigation, search, authentication-aware actions, MIDI card links, previews, downloads, bookmarks, comments, uploads, and import administration.
- Inspect desktop and mobile screenshots for overflow, text clipping, unreadable image overlays, blank assets, and reduced-motion behavior.

