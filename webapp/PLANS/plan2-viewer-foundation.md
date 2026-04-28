# Plan 2 — Media Viewer: Foundation

Spec: `specs/2026-04-28-plan2-viewer-foundation.md`  
Depends on: Plan 1 (useAsyncAction, MockControls)  
Estimated effort: 3–4 days

---

## Slices

### Slice 1 — Backend: view images and media routes

**Commit: "Add view/images and view/media API routes"**

Files to change:
- `webapp/server/routes/view.js` — extend or add:
  - `GET /api/view/media` → returns `{ media: ['usb','nvme','internal'], available: { usb: bool, ... } }`; calls lsblk or equivalent to detect mounted media
  - `GET /api/view/images` → accepts `medium`, `page`, `per_page`, `sort`, `dir` query params; calls `python3 scripts/lib_view.py --action list --medium <m> --page <p> --per-page <pp> --sort <s> --dir <d>`; returns `{ images: [...], total: N }`
  - Check existing route first — extend its query param interface if it exists rather than replacing it
- `webapp/src/utils/mockApi.js` — add mocks:
  - `GET /api/view/media` → `{ media: ['usb','internal'], available: { usb: true, nvme: false, internal: true } }`
  - `GET /api/view/images` → 120-item fixture set split by page (25 per page default), with realistic filenames, dates, thumbnail paths
  - Failure modes: `not_mounted` → 503 with `{ error: 'not_mounted' }`; `no_results` → `{ images: [], total: 0, dbExists: true }`; `db_not_initialised` → `{ images: [], total: 0, dbExists: false }`
- `webapp/tests/e2e/fixtures/api-responses.js` — add view fixture data

Verification:
- `curl 'http://localhost:3000/api/view/media'` returns expected JSON
- `curl 'http://localhost:3000/api/view/images?medium=usb&page=1&per_page=25&sort=date&dir=desc'` returns paginated images

---

### Slice 2 — Route wiring and menu update

**Commit: "Add /view route and update menu from PHP external link to internal"**

Files to change:
- `webapp/src/App.jsx` — add `<Route path="/view" element={<View />} />`; import `View`
- `webapp/src/components/Menu.jsx` — change gallery menu item:
  - Remove `external: true` and `path: '/view.php'`
  - Change to `path: '/view'` (no external flag → navigates internally)
- `webapp/src/pages/View.jsx` — replace current stub with a skeleton that renders an empty `<Box>` and a "Loading..." placeholder; full implementation in following slices

Verification:
- `npm run dev:mock` → Gallery menu item navigates to `/view` (no new tab)
- Page title updates to "Gallery" (or translated equivalent)
- Browser back button returns to previous page

---

### Slice 3 — Medium selector and image grid

**Commit: "Add medium selector and thumbnail grid to View page"**

Files to change:
- `webapp/src/pages/View.jsx` — replace skeleton with:
  - State: `medium`, `images`, `total`, `viewMode`, `selectedIndex`, `page`, `perPage`, `sortField`, `sortDir`, `columns`
  - Load available media on mount via `GET /api/view/media`
  - Medium selector: MUI `Select` with available media options
  - On medium change: fetch images via `GET /api/view/images`; uses `useAsyncAction` (disables selector during fetch)
  - Image grid: MUI `Grid` of `Card` components — thumbnail + filename caption
  - Column count selector: 1/2/3/4/6 (default 3)
  - Preferences (`perPage`, `sortField`, `sortDir`, `columns`) persisted to `localStorage` key `lbb-view-preferences` and loaded on mount
  - Empty states:
    - `not_mounted` → `Alert` "Storage medium is not mounted"
    - `no_results` → `Alert` "No images found on this medium"
    - `db_not_initialised` → `Alert` "No database found. Generate thumbnails from the Backup page first." with MUI `Link` to `/`
- `webapp/public/lang/en.json` — add view page translation keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/view-foundation.spec.js` — new test file:
  - View route renders and shows medium selector
  - Selecting a medium loads image grid
  - `not_mounted` failure shows correct Alert
  - `db_not_initialised` shows link to Backup page

Verification:
- `npm run dev:mock` → medium selector shows USB and Internal
- Selecting USB shows 25 thumbnail cards
- Column selector changes layout
- Set delay 3000ms → spinner on medium change, selector disabled
- Enable `not_mounted` → Alert with correct message
- Enable `db_not_initialised` → Alert with link to Backup
- Refresh page → column/sort preferences restored
- `npx playwright test tests/e2e/view-foundation.spec.js`

---

### Slice 4 — Sort controls and pagination

**Commit: "Add sort controls and pagination to View page"**

Files to change:
- `webapp/src/pages/View.jsx` — add to toolbar:
  - Sort field `Select`: Date / Filename / ID
  - Sort direction toggle button (ASC/DESC)
  - Per-page `Select`: 10 / 25 / 50 / 100 / 200
  - MUI `Pagination` bar below grid: First / Prev / [page X of Y] / Next / Last
  - Page resets to 1 on sort or per-page change
  - First/Prev disabled on page 1; Next/Last disabled on last page
- `webapp/tests/e2e/view-foundation.spec.js` — extend:
  - Pagination navigates between pages
  - Sort change resets to page 1
  - Per-page change reloads grid

Verification:
- Sort by Filename ASC → images in alphabetical order
- Change per-page to 10 → only 10 cards shown, "Page 1 of 12"
- Navigate to page 3 → change sort → lands on page 1
- First/Prev disabled on page 1; Next/Last disabled when on last page
- Set delay 3000ms → pagination buttons disabled during fetch

---

### Slice 5 — Single-image view with navigation

**Commit: "Add single-image view with first/prev/next/last navigation"**

Files to change:
- `webapp/src/pages/View.jsx` — add single-image view mode:
  - Clicking a thumbnail sets `viewMode: 'single'` and `selectedIndex`
  - Single-image view: full-width image, filename + date below
  - Navigation toolbar: First / Prev / [N of Total] / Next / Last buttons
  - First/Prev disabled at index 0; Next/Last disabled at last index
  - When navigating past the last image of a page: fetch next page, continue
  - Back-to-grid button: returns to grid at same page, preserving scroll position (use `sessionStorage` for scroll position)
- `webapp/tests/e2e/view-foundation.spec.js` — extend:
  - Thumbnail click opens single-image view
  - Navigation buttons cycle through images
  - Back to grid returns to same page

Verification:
- Click first thumbnail → single-image view, First/Prev disabled
- Next → advances; navigating off page boundary fetches next page seamlessly
- Last → jumps to final image
- Back to grid → same page, scroll position preserved
- Keyboard: left/right arrow keys navigate (add `keydown` event listener)
