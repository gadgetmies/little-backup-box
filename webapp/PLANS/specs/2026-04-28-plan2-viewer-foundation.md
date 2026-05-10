# Plan 2 — Media Viewer: Foundation

**Effort:** 3–4 days  
**Depends on:** Plan 1 (useAsyncAction, MockControls)  
**Blocks:** Plans 3, 4, 5

---

## What this plan delivers

- `/view` route added to the React app and menu updated from PHP external link to internal
- Storage medium selector (dropdown, not free-text path)
- Image grid with configurable column count
- Single-image view with first / prev / next / last navigation
- Sort by date / filename / ID, ASC / DESC
- Pagination: images-per-page selector and page indicator
- Per-page and sort preferences persisted in `localStorage`

---

## Architecture

### State model (lives in `View.jsx`)

```
{
  medium: 'usb' | 'nvme' | 'internal',   // selected storage
  page: number,                           // 1-based
  perPage: 25,                            // 10|25|50|100|200
  sortField: 'date' | 'filename' | 'id',
  sortDir: 'asc' | 'desc',
  columns: 3,                             // 1|2|3|4|6
  images: ImageRecord[],                  // current page
  total: number,                          // total matching images
  selectedIndex: number | null,           // for single-image view
  viewMode: 'grid' | 'single',
}
```

Filter state is not included here — that is Plan 4. This plan only fetches all images for
the selected medium.

### Data flow

```
View.jsx state change
  → GET /api/view/images?medium=usb&page=1&per_page=25&sort=date&dir=desc
  → Node route → python3 scripts/lib_view.py --medium usb --page 1 ...
  → JSON { images: [...], total: 342 }
  → Update state → re-render
```

### Route and navigation

Add to `App.jsx`:
```jsx
<Route path="/view" element={<View />} />
```

Update `Menu.jsx` `menuItems`:
```js
// Change from:
{ path: '/view.php', key: 'gallery', icon: <PhotoLibraryIcon />, external: true }
// To:
{ path: '/view', key: 'gallery', icon: <PhotoLibraryIcon /> }
```

---

## Components

### View.jsx (full rebuild)

Sections:
1. **Toolbar** — medium selector, sort controls, per-page selector, column count control
2. **Grid view** — MUI `Grid` of image cards, each card shows thumbnail + filename + date
3. **Single-image view** — full-width image, filename/date below, navigation buttons
4. **Pagination bar** — First / Prev / [page X of Y] / Next / Last (MUI `Pagination`)

Empty states:
- Medium not mounted → Alert "Storage medium is not mounted"
- No images → Alert "No images found on this medium"
- DB not initialised → Alert "No database found. Generate thumbnails from the Backup page first." with link to Backup

### Backend route additions (`webapp/server/routes/view.js`)

```
GET /api/view/images
  Query: medium, page, per_page, sort, dir
  Calls: lib_view.py --action list --medium <m> --page <p> --per-page <pp> --sort <s> --dir <d>
  Returns: { images: [...], total: N }

GET /api/view/media
  Returns: { media: ['usb', 'nvme', 'internal'], available: { usb: true, nvme: false, internal: true } }
```

The existing `GET /api/view/images` endpoint may need its query parameter interface extended —
check `webapp/server/routes/view.js` and align with `lib_view.py`'s accepted arguments.

---

## localStorage persistence

Key: `lbb-view-preferences`

```json
{ "perPage": 25, "sortField": "date", "sortDir": "desc", "columns": 3 }
```

Loaded on mount; updated on change. The medium and page are not persisted (always start
fresh on navigation).

---

## Mock data to add

`GET /api/view/media` → `{ media: ['usb', 'internal'], available: { usb: true, nvme: false, internal: true } }`

`GET /api/view/images` → array of 50 fixture images with realistic filenames, dates, thumbnail
paths pointing to placeholder images. Total set should be 120 so pagination can be tested.

Failure modes: `not_mounted`, `no_results`, `db_not_initialised` (custom: returns `{ images: [], total: 0, dbExists: false }`)

---

## Verification

### 1. Static
- `npm run lint && npm run build` pass
- No TypeScript errors in new route

### 2. Mock UI (`npm run dev:mock`)
- Menu shows "Gallery" (or translated equivalent) linking to `/view` (not opening new tab)
- View page loads with medium selector showing USB and Internal (NVMe unavailable)
- Selecting USB fetches and displays image grid
- Default 3-column grid renders thumbnails with filename captions
- Column selector changes layout immediately
- Sort dropdown changes order of images
- Per-page selector shows 10/25/50/100/200; changing re-fetches
- Pagination bar shows "Page 1 of 5" (for 120 images, 25 per page)
- First/Prev/Next/Last buttons work; Prev and First disabled on page 1
- Clicking a thumbnail opens single-image view
- Single-image view shows navigation; First/Prev disabled on first image
- Pressing Prev/Next navigates; wraps at boundaries with Last/First disabled
- Back to grid returns to same page and scroll position
- Set delay 3000ms → loading spinner on medium change, pagination buttons disabled
- Enable `not_mounted` → Alert "Storage medium is not mounted" shown, no grid
- Enable `no_results` → Alert "No images found" shown
- Enable `db_not_initialised` → specific Alert with link to Backup page
- Preferences (sort, per-page, columns) survive a page refresh

### 3. E2E tests (`webapp/tests/e2e/view-foundation.spec.js`)
- View route renders and loads media list
- Selecting a medium loads image grid
- Pagination controls navigate between pages
- Single-image view opens on thumbnail click
- Navigation buttons cycle through images
- `not_mounted` failure shows correct Alert

### 4. Real hardware
- Gallery menu item navigates to React view (not PHP view.php)
- USB with backed-up and thumbnail-generated images displays grid correctly
- Pagination works with a large set (100+ images)
- Sort by date DESC shows newest images first
