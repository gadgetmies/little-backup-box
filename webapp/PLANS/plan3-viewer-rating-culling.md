# Plan 3 — Media Viewer: Rating, Culling & Metadata

Spec: `specs/2026-04-28-plan3-viewer-rating-culling.md`  
Depends on: Plan 2  
Estimated effort: 2–3 days

---

## Slices

### Slice 1 — Backend: rating and delete-rejected routes

**Commit: "Add view/rating and view/delete-rejected API routes"**

Files to change:
- `webapp/server/routes/view.js` — add:
  - `POST /api/view/rating` — body: `{ medium, imageId, rating, comment }`; calls `lib_metadata.py --action set_rating ...`; if `conf_WRITE_EXIF_RATING === 'true'` passes `--write-exif true`
  - `POST /api/view/delete-rejected` — body: `{ medium }`; calls deletion script (verify script name against `scripts/cmd.php`); streams log lines; returns `{ success: bool, deleted: N }`
- `webapp/src/utils/mockApi.js` — add mocks:
  - `POST /api/view/rating` — 300ms delay happy path `{ success: true }`; failure modes: `db_locked` (500 `{ error: 'DB locked by another process' }`), `permission_denied` (500 `{ error: 'EXIF write failed: file is read-only' }`)
  - `POST /api/view/delete-rejected` — streams 3 log lines over delay, `{ success: true, deleted: 3 }`; failure modes: `db_locked`, `partial_failure` (`{ success: false, deleted: 2, error: '1 file could not be deleted' }`)
- `webapp/tests/e2e/fixtures/api-responses.js` — extend image fixture records: add `rating` (mix of −1, 0, 1–5), `comment` fields

Verification:
- `curl -X POST /api/view/rating -d '{"medium":"usb","imageId":1,"rating":3}'` returns `{ success: true }`

---

### Slice 2 — RatingWidget component

**Commit: "Add reusable RatingWidget component"**

Files to create:
- `webapp/src/components/RatingWidget.jsx`
  - Props: `{ value, onChange, disabled, size }` — `size` is `'small'` | `'normal'`
  - Renders: reject button (red ✕ for −1), 5 star icons (filled/empty based on `value`)
  - Click on ✕ → `onChange(-1)`; click on star N → `onChange(N)`; click on active star → `onChange(0)` (unrate)
  - `disabled` prop makes all icons non-interactive and visually muted
  - No async logic — pure controlled component; caller handles saves
- `webapp/tests/e2e/view-rating.spec.js` — new test:
  - RatingWidget renders reject and star icons
  - Clicking a star calls onChange with correct value
  - Clicking active star calls onChange(0)
  - disabled prop prevents interaction

Verification:
- Render `<RatingWidget value={3} onChange={fn} />` in Storybook or directly in View — 3 stars filled, 2 empty
- Clicking ✕ calls onChange(−1)
- `npx playwright test tests/e2e/view-rating.spec.js`

---

### Slice 3 — Rating in grid and single-image view

**Commit: "Add rating widget with optimistic save to View page"**

Files to change:
- `webapp/src/pages/View.jsx`
  - Grid: overlay `<RatingWidget size="small" />` at bottom of each thumbnail card
  - Single-image view: `<RatingWidget size="normal" />` below the image
  - Comment `TextField multiline` below rating in single-image view; `inputProps={{ maxLength: 500 }}`; helper text shows "N / 500"
  - Save logic: optimistic update (state changes immediately); debounced 800ms for rating, 1200ms for comment; background `POST /api/view/rating`; on failure → rollback + inline `Alert severity="error"` below the widget
  - Inline error clears on next save attempt
  - Uses `useAsyncAction` only for tracking background save state (spinner on the card during pending save)
- `webapp/public/lang/en.json` — add rating/comment translation keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/view-rating.spec.js` — extend:
  - Rating widget renders in grid and single-image view
  - Clicking a star updates displayed rating immediately (optimistic)
  - `db_locked` failure reverts rating and shows inline error
  - Comment field shows character counter

Verification:
- `npm run dev:mock` → each thumbnail card has small rating widget
- Click star → updates immediately, no delay
- Set delay 3000ms → star still updates immediately; background spinner on card
- Enable `db_locked` → rating reverts after delay, error Alert below card
- Single-image: comment field present, "0 / 500" counter
- Type 450+ chars → counter warning style
- Enable `permission_denied` → error "EXIF write failed: file is read-only" shown

---

### Slice 4 — Delete rejected images

**Commit: "Add bulk delete rejected images action to View page"**

Files to change:
- `webapp/src/pages/View.jsx`
  - Add "Delete rejected" `Button` in grid toolbar; visible only when `images.some(img => img.rating === -1)`
  - Click → MUI `Dialog` with count: "Delete all rejected images on [medium]? X images will be permanently deleted. This cannot be undone."
  - Cancel → closes dialog, no change
  - Confirm → `POST /api/view/delete-rejected`; uses `useAsyncAction`; dialog stays open showing `LogMonitor` during operation; on complete → close dialog, refresh image list
  - On partial failure → show inline `Alert severity="warning"` in dialog before closing: "N of M rejected images deleted. X could not be deleted."
- `webapp/tests/e2e/view-rating.spec.js` — extend:
  - Delete rejected button visible when rejected images exist
  - Confirmation dialog shows correct count
  - Cancel closes dialog without change
  - Confirm triggers delete and refreshes list
  - `partial_failure` shows warning message

Verification:
- `npm run dev:mock` → "Delete rejected" button visible (fixture has rejected images)
- Click → dialog shows "3 images will be permanently deleted"
- Cancel → dialog closes, no change
- Confirm → log lines stream in dialog, then closes, rejected images gone from grid
- Enable `partial_failure` → warning message in dialog
- Enable `db_locked` → error in dialog, images unchanged
