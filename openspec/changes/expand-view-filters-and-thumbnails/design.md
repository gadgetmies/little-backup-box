## Context

The View page is a React 18 + MUI v5 component (`webapp/src/pages/View.jsx`) that lists media on the device. It calls the Express backend at `webapp/server/routes/view.js`, which on real hardware shells out to `scripts/lib_view.py` for medium-aware queries and falls back to direct sqlite reads when called with a `storagePath` (mock / legacy path).

Today the FilterBar (`webapp/src/components/FilterBar.jsx`) covers rating, date range, filename, camera, file type. The backend `/view/stats` already returns `directories` and `fileTypeExtensions` arrays — the dropdowns simply aren't rendered yet. The `/view/images` Python branch does **not** accept directory / extension / social parameters, so this proposal needs both UI surfacing and backend wiring.

The grid renders `https://placehold.co/200x150?text=…` for every image (`View.jsx:728`). That breaks offline use of the device, leaks image filenames to a third-party host, and makes the grid unhelpful for triage. There is already an `/api/view/image?medium=…&id=…` endpoint that serves the original file, used by single view (`View.jsx:361`).

Constraints:
- The webapp must mirror the PHP UI's behaviour where the PHP UI is canonical (per `CLAUDE.md` § "Script alignment"). For read queries against the per-medium image database, **the PHP UI is the precedent and it does the SQL inline** (`scripts/view.php:651,667` opens `new SQLite3($DATABASE_FILE)`, `view.php:595-611` builds the WHERE clauses in PHP). There is no Python helper for `list` queries — `lib_view.py` exposes only `--action init` for schema initialization. The Node route at `webapp/server/routes/view.js:139-187` invokes `lib_view.py --action list`, which does not exist; that branch is dead code. Replacing PHP with Node here means: keep the inline-sqlite path, delete the dead Python branch.
- Mock mode (`USE_MOCKS=true` on Mac/Windows and the GitHub Pages static build) needs equivalent fixtures so tests pass without a Pi.
- All new user-visible strings go through `useLanguage().t(...)`, with keys added to all five language files.
- The page already persists prefs in `localStorage` under `lbb-view-preferences` and reflects filters in URL search params; the new filters need to participate in both.

Stakeholders: device owners triaging large libraries; the existing FilterBar e2e suite; whoever maintains `lib_view.py`.

## Goals / Non-Goals

**Goals:**
- Surface `medium`, `directory`, `extension`, `social_publish`, `social_published`, and `images-per-page` as first-class filters that round-trip through URL params, localStorage, the Node `/view/images` query, and `lib_view.py --action list`.
- Replace the grid placeholder with a real, sized thumbnail served by `/api/view/image?variant=thumb`, with caching headers so the browser does not re-fetch on pagination changes.
- Keep behaviour identical for users that don't touch the new controls (zero-config defaults, same `total` counting, same selectedIndex semantics).
- Ship Playwright coverage for at least the medium and directory filters and the thumbnail render.

**Non-Goals:**
- Date grouping, EXIF metadata table, video/audio/text playback, download links, low-res preview warnings, rating visual indicator on grid cards. These remain Plan 04 followups.
- Reworking the legacy `storagePath` branch in `/view/images` beyond what's needed to keep tests passing — the long-term direction is medium-only.
- Adding new social services beyond the four already configurable (telegram, mastodon, bluesky, matrix).

## Decisions

### 1. Where the new filter parameters live in the request shape
Use snake_case query params on the Node route to match the existing convention (`date_from`, `date_to`, `file_type`):
- `directory=<path>` — exact match against `EXIF_DATA.Directory`.
- `extension=<csv>` — `IN (...)` against `EXIF_DATA.File_Extension`, matching the multi-value pattern already used for `rating` and `file_type`.
- `social_publish=<service-csv>` and `social_published=<service-csv>` — comma-separated service names; intersected with rows that have any of those services flagged.

**Alternative considered**: a generic `filters[social.bluesky.publish]=true` shape. Rejected — heavier on both client and server, no other consumer needs that flexibility.

### 2. Where the SQL lives
The query path is consolidated into the existing inline-sqlite branch in `webapp/server/routes/view.js` (currently the legacy `storagePath`-based path, lines ~76-137). The dead `lib_view.py --action list` branch (lines ~139-187) is deleted. The route always opens the per-medium sqlite database with `node-sqlite3` and builds WHERE clauses in JS, mirroring how `scripts/view.php:595-611` does it in PHP.

The social-publish columns are bitmask integers on a single column each (per pre-flight `tasks.md` § 1.1):
- `social_publish integer default 0` (`scripts/lib_view.py:78`)
- `social_published integer default 0` (`scripts/lib_view.py:79`)

Bit assignment in `scripts/lib_socialmedia.py:145-157` (`telegram=0, mastodon=1, bluesky=2, matrix=3`). The Node route MUST derive the bit map at runtime — either by shelling out to `python3 lib_socialmedia.py --action get_social_service_bit --service <name>` once at boot and caching the integers, or by reading the same hard-coded list from a small JS helper that mirrors `lib_socialmedia.py` and is unit-tested to stay in sync. Hard-coded integers in the SQL builder are forbidden because a future reorder of the Python list would silently invert results.

WHERE-clause forms (matching `scripts/view.php`):
- `directory=<path>` → `Directory = ?` (PHP: `view.php:595`)
- `extension=<csv>` → `File_Type_Extension IN (?…)` — note the column is `File_Type_Extension`, not `File_Extension`; this matches both the schema in `lib_view.py:74` and PHP's filter at `view.php:606`
- `social_publish=<service-csv>` → `((social_publish & ?) != 0 OR (social_publish & ?) != 0 …)`, one OR-joined clause per service (PHP: `view.php:610`, single-service form `(social_publish & (1 << $filter_social_publish)) != 0`)
- `social_published=<service-csv>` → same pattern against the `social_published` column (PHP: `view.php:611`)

The route's `medium` parameter is resolved to a `storagePath` at the top of the handler (`path.join(req.constants.const_MEDIA_DIR, medium)`) so a single inline-sqlite path serves both the new `medium` shape and the legacy `storagePath` shape.

**Alternative considered**: add `--action list` to `lib_view.py` and route everything through Python. Rejected — PHP doesn't do this; replacing PHP with Node faithfully means doing the SQL where PHP does it (in the request handler).

### 3. Thumbnail strategy
The device already maintains a per-image thumbnail cache at `<MountPoint>/<directory>/tims/<filename>.JPG`, written by `scripts/backup.py:1445-1508` `generateThumbnails`. Thumbnails are ≤ 800 px JPEG (rendered with ImageMagick `convert` for JPEG/TIFF, with `dcraw_emu | convert` for RAW, with `ffmpeg` for video). The user can refresh them at any time via the existing "Generate thumbnails" button in `DatabaseOperations` on the Backup page.

`GET /api/view/image?variant=thumb` resolves the image row the same way the existing endpoint does, then:

1. Compute `tims_path = <storagePath>/<image.Directory>/tims/<image.File_Name>.JPG`.
2. If `tims_path` exists, set `Content-Type: image/jpeg` and `res.sendFile(tims_path)`.
3. If it doesn't, fall back to streaming the original file (current behaviour), so the grid still renders something, just larger.

We deliberately do **not** Pillow-encode on demand. The TIMS files are already produced by the device's existing pipeline and cover every supported file type (including RAW and video poster frames). Reusing them means: no new dependency, no per-request encoding cost, and a single source of truth for thumbnail look (JPEG ≤ 800 px). The grid card height stays at 150 px; the browser scales the 800 px source down — small enough that the bandwidth difference vs a 256 px encode is not worth the complexity.

**Alternative considered**: encode on demand with Pillow at 256 px. Rejected because the device already has thumbnails produced by ImageMagick / `dcraw_emu` / `ffmpeg`, which handle file types Pillow can't (CR2/NEF, MP4 first frame). Re-implementing that pipeline in Pillow would be redundant and would diverge from what the LCD/PHP UI shows.

**Alternative considered**: directory-level cache (`.lbb-thumbs/<id>.jpg`) maintained by the webapp. Rejected for the same reason — TIMS already exists.

If thumbnails are missing for a given medium, the user is expected to run "Generate thumbnails" from the existing Database Operations panel. The grid will render originals in the meantime; that's annoying but not broken.

### 4. Images-per-page UX
The existing `perPage` state is already used to query the backend; only the FilterBar needs a `Select` that lets the user pick a count. Options follow the PHP UI: `5×columns`, `10×columns`, `20×columns`, `50×columns`, `100×columns`, recomputed when `columns` changes. Persist the multiplier (1×, 2×, …) rather than the raw count so changing column layouts keeps a sensible default.

### 5. Filter persistence
Store the new fields in the same `lbb-view-preferences` blob (medium / extension / social filters are conceptually session-scoped but users will appreciate persistence). Reflect them in the URL via `useSearchParams` so links shared between users / browser tabs preserve the view.

### 6. Mock parity
Add corresponding fixtures to `webapp/src/utils/mockApi.js` (browser mocks for the static GitHub Pages build) and `webapp/server/utils/mockSystem.js` (Node mock when `USE_MOCKS=true`). For the thumbnail variant, mock mode serves a small static asset (1×1 transparent PNG) so tests have a deterministic, dependency-free response.

## Risks / Trade-offs

- **TIMS file missing for some images** → Endpoint falls back to the original file; grid still renders but a single page may transfer hundreds of MB of originals. Mitigation: mark this in the PR description, point users at the existing "Generate thumbnails" button. Followup (out of scope here) is to surface a "thumbnails missing" hint in the View page when the count of missing TIMS exceeds a threshold.
- **Bitmask map drift** → If `get_social_service_bit` ever reorders services, persisted `social_publish` integers become wrong (this is a pre-existing risk in the device, not introduced here). Mitigation: derive the map at runtime, never inline integers, and add a comment in `lib_socialmedia.py` warning that the order is load-bearing.
- **WHERE-clause builder sprawl** → the Node route's filter list grows to 9 (rating, date_from, date_to, filename, camera, file_type, directory, extension, social_publish, social_published). Mitigation: keep the builder table-driven so each filter is one entry mapping `{ param → { column, op, paramShape } }`. Mirrors the PHP pattern in `view.php:595-611`.
- **URL-param explosion** → adding extension and social-service CSVs to URLs makes them long. Mitigation: only emit a key in the URL when its value is non-default (already the pattern); skip keys with empty values.
- **Localization drift** → 5 languages × ~12 new keys = 60 translations. Mitigation: machine-translate non-English from the existing matching keys (the `view.filter.*` namespace already has German/Spanish/French/Finnish strings to mirror), then have a native speaker review at PR time.
- **Mock fixture rot** → adding params without corresponding mock branches will break the GitHub Pages preview. Mitigation: covered explicitly in tasks.

## Migration Plan

This is purely additive in user-visible behaviour. No DB migrations, no breaking API changes — the new query params are optional. Rollout:
1. Land the Node route changes (delete dead `lib_view.py --action list` branch, extend the inline-sqlite branch with new filters and the thumb variant) and the matching mocks together; no UI yet.
2. Land FilterBar / View.jsx changes.
3. Add Playwright tests.
4. Translate keys.
5. No rollback steps needed beyond a normal `git revert` — the new state is a strict superset.

## Open Questions

Resolved during pre-flight (`tasks.md` § 1):

- **Schema**: `EXIF_DATA` has `social_publish` and `social_published` as bitmask integer columns (`scripts/lib_view.py:78-79`); bit assignment in `scripts/lib_socialmedia.py:145-157` (`telegram=0, mastodon=1, bluesky=2, matrix=3`). Decision 2 above updated to reflect this.
- **Pillow**: present in the scripts environment (`display.py`, `lib_comitup.py`, `lib_network.py` all import it). Not used by this change after the pivot in Decision 3.
- **Thumbnail cache**: yes — `<MountPoint>/<directory>/tims/<filename>.JPG`, generated by `scripts/backup.py:1445-1508`. Decision 3 updated to serve TIMS files instead of encoding.

Still open:

- Whether to surface a "regenerate thumbnails" prompt on the View page when many TIMS files are missing for the selected medium. Out of scope here; tracked as a Plan 04 followup.
