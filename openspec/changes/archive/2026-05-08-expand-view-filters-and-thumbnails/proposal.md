## Why

The `/view` page in the React webapp is the user's primary tool for triaging media after a backup, and per `webapp/.IMPLEMENTATION_STATUS.md` it is the largest remaining gap toward parity with the PHP UI: half of the FilterBar dimensions are missing and the grid still renders `https://placehold.co` placeholders instead of the real media. With realistic libraries running into thousands of files, browsing without medium / directory / extension / social filters is impractical, and external placeholders break offline use.

## What Changes

- **Filters**: extend `src/components/FilterBar.jsx` with controls for directory, file-type extension, and social-media publish status (per configured service). The medium selector and the images-per-page selector already exist as page-header controls in `src/pages/View.jsx`; relocating them into FilterBar is deferred to a follow-up polish change so this proposal stays focused on closing genuine functional gaps.
- **Backend query**: extend `GET /api/view/images` to accept `directory`, `extension`, `social_publish`, and `social_published` parameters and translate them to inline sqlite WHERE clauses, mirroring the PHP implementation in `scripts/view.php:595-611`. The Node route currently has a dead `lib_view.py --action list` branch (no such action exists in the script — only `--action init`); that branch is removed and the legacy `storagePath` / sqlite path becomes the single canonical path. The medium parameter is reframed as "look up `storagePath` from `medium`" inside the same code path.
- **Stats**: extend `GET /api/view/stats` to also return per-service counts for `socialPublishPending` and `socialPublished` (the directory list and file-extension list are already returned but currently unused by the FilterBar).
- **Thumbnails**: replace the `placehold.co` image source in the grid `CardMedia` (`src/pages/View.jsx:728`) with a real thumbnail fetched from `/api/view/image`. Add a thumbnail mode to that endpoint (`?variant=thumb`, default size 256 px on the long edge) backed by Pillow / `lib_view.py` so the response is small enough for grid rendering.
- **Persistence**: persist the new filter selections in the same `lbb-view-preferences` localStorage payload and the URL search params so that reloads and shared links restore the full filter set.
- **i18n**: add translation keys for the new controls across en/de/es/fi/fr.
- **E2E**: extend the existing Playwright suites (`tests/e2e/view-foundation.spec.js`, `view-filter-social.spec.js`) with coverage for the new filters and the thumbnail render path.

Non-goals: video / audio / text-file rendering in single view, EXIF metadata table, low-resolution preview warnings, date grouping, rating visual indicators in grid, download links. These are tracked in `.IMPLEMENTATION_STATUS.md` Plan 04 and will be separate proposals.

## Capabilities

### New Capabilities
- `view-page-filtering`: query controls and persistence for filtering the View page image grid by medium, directory, extension, social publish status, and per-page count, on top of the existing rating/date/filename/camera/file-type filters.
- `view-page-thumbnails`: server-rendered thumbnails for grid rendering of the View page, replacing the external placeholder host with a sized thumbnail variant of `/api/view/image`.

### Modified Capabilities
<!-- No existing capabilities to modify; openspec/specs/ is empty. -->

## Impact

- **Frontend**:
  - `webapp/src/components/FilterBar.jsx` — extend with the five new controls and update `DEFAULT_FILTERS`.
  - `webapp/src/pages/View.jsx` — extend `filtersToParams` / `searchToFilters`, persist new prefs, swap the grid `CardMedia` source.
- **Backend**:
  - `webapp/server/routes/view.js` — delete the dead `lib_view.py --action list` branch; extend the inline-sqlite path to accept `directory`, `extension`, `social_publish`, `social_published`; add a `?variant=thumb` branch to `/image` that serves the existing TIMS thumbnail file; extend `/stats` with social aggregates.
  - `scripts/lib_view.py` — **no change**. Schema init (`--action init`) is the only thing it owns and it stays that way. Read queries continue to live where the PHP UI puts them: in the request handler, against sqlite directly.
- **i18n**: `webapp/public/lang/{en,de,es,fi,fr}.json`.
- **Tests**: `webapp/tests/e2e/view-foundation.spec.js`, `webapp/tests/e2e/view-filter-social.spec.js`, plus mock fixtures in `webapp/tests/e2e/fixtures/api-responses.js` and `webapp/src/utils/mockApi.js`.
- **No new runtime deps** on the JS side. Python side may need to confirm Pillow is available; the device image already ships it for thumbnail generation in `lib_database.py`, so no new dep.
