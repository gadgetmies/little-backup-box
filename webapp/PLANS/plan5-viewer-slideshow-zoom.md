# Plan 5 — Media Viewer: Slideshow & Zoom

Spec: `specs/2026-04-28-plan5-viewer-slideshow-zoom.md`  
Depends on: Plan 2  
Can be developed in parallel with Plans 3 & 4  
Estimated effort: ~1 day

---

## Slices

### Slice 1 — Backend: full-resolution image serving route

**Commit: "Add view/image full-resolution serving route"**

Files to change:
- `webapp/server/routes/view.js`
  - Add `GET /api/view/image?medium=<m>&id=<imageId>` → streams original image file from disk; content-type derived from file extension
  - If file not found on disk (thumbnail exists but original deleted): return 404 with `{ error: 'file_missing' }`
- `webapp/src/utils/mockApi.js`
  - `GET /api/view/image` → returns a larger placeholder image (use a publicly available placeholder URL or a base64 encoded small JPEG in fixtures); applies configured delay
  - Failure modes: `file_missing` (404 `{ error: 'file_missing' }`)

Verification:
- `curl '/api/view/image?medium=usb&id=1'` returns image binary with correct content-type

---

### Slice 2 — Slideshow

**Commit: "Add slideshow to single-image view"**

Files to change:
- `webapp/src/pages/View.jsx`
  - Add `isPlaying` state (bool) and `intervalSeconds` state (default 5)
  - Play/stop `IconButton` in single-image toolbar (`PlayArrow` / `Stop` icons)
  - Interval `TextField` (type number, width ~80px, min 1, max 60) next to play button; disabled while playing
  - `useEffect` with `setInterval` when `isPlaying`; advances `selectedIndex` by 1, wrapping at end of image list
  - When navigating pages during slideshow: fetch next page, continue advancing
  - Pause (set `isPlaying = false`) when user manually clicks Prev/Next
  - Stop slideshow (`clearInterval`) when exiting single-image view
  - Cleanup `clearInterval` in `useEffect` return
- `webapp/public/lang/en.json` — slideshow label keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/view-slideshow-zoom.spec.js` — new test file:
  - Play button starts slideshow (advances image after interval)
  - Stop button stops it
  - Manual navigation pauses slideshow
  - Exiting to grid stops slideshow

Verification:
- `npm run dev:mock` → play button in single-image toolbar
- Click play → images advance every 5 seconds
- Interval input disabled during playback
- Change interval to 2 → faster advance
- Click Prev/Next → play button active again (paused)
- Back to grid → slideshow stopped (no timer leak)
- `npx playwright test tests/e2e/view-slideshow-zoom.spec.js`

---

### Slice 3 — Magnifying glass zoom/pan

**Commit: "Add full-resolution zoom and pan to single-image view"**

Files to change:
- `webapp/src/pages/View.jsx`
  - Add `zoomMode` state (bool) and `zoomLevel` state (default 1)
  - `ZoomIn` `IconButton` in single-image toolbar
  - On first zoom toggle: load full-res image via `GET /api/view/image`; uses `useAsyncAction` with `loadingDelay: 800ms` (spinner after 800ms to avoid flash on fast connections)
  - Full-res image renders in place of thumbnail when `zoomMode === true`
  - CSS: `transform: scale(zoomLevel)`, `transformOrigin` tracks pointer position on mousemove
  - Mouse wheel → increment/decrement `zoomLevel` (range 1×–8×, step 0.5)
  - Touch: pinch gesture → update `zoomLevel` via `touchstart`/`touchmove` events
  - Click-drag → pan (CSS `cursor: grab`, translate via `transform`)
  - `ZoomIn` / `ZoomOut` icon buttons for keyboard/pointer users
  - Escape key or second click on zoom button → exit zoom mode, return to thumbnail
  - If `file_missing` error: inline `Alert severity="error"` "Original file not available"; zoom button disabled for this image
- `webapp/tests/e2e/view-slideshow-zoom.spec.js` — extend:
  - Zoom button loads full-res image
  - `file_missing` failure shows Alert and disables zoom button

Verification:
- `npm run dev:mock` → zoom button in single-image toolbar
- Click → larger placeholder loads, zoom mode active
- Mouse wheel → zoom in/out
- Click-drag → pans image
- Click zoom button again → exits zoom, thumbnail shown
- Escape key → exits zoom
- Set delay 3000ms → spinner appears after 800ms on zoom click (not immediately)
- Enable `file_missing` → Alert "Original file not available", zoom button greyed out
