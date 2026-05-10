# Media Viewer — Rating & Reject System

**Priority:** 1 (Critical)  
**PHP source:** `scripts/view.php` lines ~700–900, `scripts/lib_metadata.py`

---

## What the PHP implementation does

The PHP viewer exposes a full star-rating UI on every image in both grid and single-image
views:

- **Rating range:** −1 (reject) through 0 (unrated) to 5 stars
- Reject (−1) is displayed as a red ✕; stars 1–5 are rendered as filled/empty star icons
- Rating is stored in the SQLite `EXIF_DATA` table (`rating` column) for the storage medium
- A **"Save ratings"** button writes accumulated changes back to the database
- When the "Write rating to EXIF" setting is enabled, `lib_metadata.py` is called to embed
  the `XMP:Rating` tag directly into the image file
- The **"Delete rejected images"** action (see `delete-rejected.md`) depends on this field

## What the webapp currently has

`webapp/src/pages/View.jsx` is a minimal stub.  It renders a thumbnail grid and can toggle to
single-image view, but has **no rating UI** of any kind.  The backend has no route for
updating rating data.

## Gap

| PHP capability | Webapp status |
|---|---|
| −1 reject / 0–5 star rating widget per image | Missing |
| Save ratings to SQLite | Missing |
| Write rating to EXIF (optional) | Missing (setting also missing — see write-rating-to-exif.md) |
| Display current rating on thumbnail / single view | Missing |

## Implementation notes

- The SQLite schema already exists on-device; `lib_metadata.py` handles EXIF writes
- A new Express route `POST /view/rating` (body: `{ path, rating }`) would persist to DB
- The existing `api.js` utility and React state pattern used elsewhere in the webapp can
  drive optimistic UI updates
- Rating widget component should be reusable (used in both grid and single-image views)
