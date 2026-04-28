# Plan 3 — Media Viewer: Rating, Culling & Metadata

**Effort:** 2–3 days  
**Depends on:** Plan 2 (viewer foundation)  
**Blocks:** Plan 4 (rating filter needs rating data)

---

## What this plan delivers

- Star rating widget (−1 reject → 0 unrated → 1–5 stars) in grid and single-image view
- Ratings and comments persisted to SQLite via new backend route
- Comment textarea with character counter in single-image view
- Bulk delete of rejected images (−1) with confirmation dialog
- `write_rating_to_exif` setting hook (setting itself is in Plan 6; this plan checks the flag)

---

## Rating widget

### Values and display

| Value | Label | Display |
|---|---|---|
| −1 | Reject | Red ✕ icon |
| 0 | Unrated | Empty stars / grey dash |
| 1–5 | Stars | Filled star icons |

The widget is a reusable component: `webapp/src/components/RatingWidget.jsx`

Props: `{ value, onChange, disabled, size }` where `size` is `'small'` (grid) or `'normal'`
(single-image).

In the grid, the small widget overlays the bottom of the thumbnail card. In single-image
view, the normal widget sits below the image.

### Save behaviour

Ratings are saved **optimistically** — the UI updates immediately, then the backend call is
made in the background. If the backend call fails the UI rolls back and shows an inline error.

Saves are debounced 800ms so rapid star changes don't fire multiple requests.

### Backend route

```
POST /api/view/rating
Body: { medium, imageId, rating }
Returns: { success: true } | { error: string }
```

Node route calls: `python3 scripts/lib_metadata.py --action set_rating --id <imageId> --rating <r> --medium <m>`

If `conf_WRITE_EXIF_RATING === 'true'` in config, also passes `--write-exif true` so
`lib_metadata.py` embeds `XMP:Rating` into the image file.

---

## Comment textarea

Shown only in single-image view, below the rating widget.

- MUI `TextField multiline` with `inputProps={{ maxLength: 500 }}`
- Character counter displayed as helper text: "123 / 500"
- Saved together with rating on the same `POST /api/view/rating` call (add `comment` field)
- Debounced 1200ms (comments are longer to type than ratings)

---

## Delete rejected images

Toolbar button: "Delete rejected" — only visible when at least one image in the current
medium has rating −1.

Flow:
1. Button click → MUI `Dialog` confirmation: "Delete all rejected images on [medium]? This
   cannot be undone. X images will be permanently deleted."
2. Confirm → `POST /api/view/delete-rejected { medium }` → streams deletion log
3. On completion → refresh image list (re-fetch current page)

Backend route calls: existing shell/Python script for deletion; check PHP implementation
for the exact script and arguments.

### Backend route

```
POST /api/view/delete-rejected
Body: { medium }
Returns: streaming log then { success: true, deleted: N } | { error, deleted: N }
```

---

## Mock data additions

Extend fixture image records with `rating` (−1 to 5) and `comment` (string) fields.
Include at least 3 rejected images so the delete flow can be tested.

`POST /api/view/rating` happy path: 300ms delay, returns `{ success: true }`.
`POST /api/view/delete-rejected` happy path: streams 3 log lines, returns `{ success: true, deleted: 3 }`.

Failure modes:
- `db_locked` → rating save rolls back optimistic update, shows inline error
- `permission_denied` → EXIF write fails (distinct message: "Rating saved but EXIF write failed")
- `partial_failure` on delete → "3 of 5 rejected images deleted. 2 could not be deleted."

---

## Verification

### 1. Static
- `npm run lint && npm run build` pass

### 2. Mock UI (`npm run dev:mock`)
- Grid view: small rating widget visible on each thumbnail card
- Click star on a card → optimistic update visible immediately, no spinner
- Set delay 3000ms → star updates immediately (optimistic), background save spinner
- Enable `db_locked` → star reverts to previous value after delay, inline error below card
- Single-image view: full rating widget and comment field visible
- Enter comment → character counter updates in real time
- Counter turns red/warning at 450 characters
- "Delete rejected" button visible only when rejected images exist (rating = −1)
- Click "Delete rejected" → confirmation dialog with count
- Cancel → nothing changes
- Confirm → log streams, images refresh, deleted images gone from grid
- Enable `partial_failure` on delete → partial success message, some images remain
- Enable `db_locked` on delete → error Alert, no images deleted

### 3. E2E tests (`webapp/tests/e2e/view-rating.spec.js`)
- Rating widget renders in grid and single-image view
- Clicking a star updates the displayed rating
- db_locked failure reverts optimistic update and shows error
- Delete rejected dialog appears and can be cancelled
- Confirm delete refreshes image list

### 4. Real hardware
- Rate images on a backed-up USB drive → ratings persist across page refreshes
- Set `conf_WRITE_EXIF_RATING=true` → verify XMP:Rating in file with exiftool
- Delete rejected → files physically removed from drive
