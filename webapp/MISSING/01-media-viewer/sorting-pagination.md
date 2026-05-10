# Media Viewer — Sorting & Pagination

**Priority:** 1 (Critical)  
**PHP source:** `scripts/view.php` lines ~150–240

---

## What the PHP implementation does

**Sorting:**

- Sort field: date / filename / database ID
- Sort direction: ASC / DESC
- Default: date DESC (newest first)

**Pagination:**

- Configurable images-per-page: 10 / 25 / 50 / 100 / 200
- First / Prev / Next / Last navigation buttons
- Current page and total page count displayed
- Page state preserved in GET parameters

**Grid layout:**

- Column count control (1 / 2 / 3 / 4 / 6 columns)

## What the webapp currently has

`View.jsx` renders all thumbnails from a single fetch with no sorting, no pagination, and a
fixed grid layout.  On a storage medium with thousands of images this will be unusable.

## Gap

| PHP capability | Webapp status |
|---|---|
| Sort by date / filename / ID | Missing |
| Sort direction toggle | Missing |
| Images-per-page selector | Missing |
| First / Prev / Next / Last navigation | Missing |
| Page indicator | Missing |
| Column count control | Missing |

## Implementation notes

- Pagination is already handled server-side in `lib_view.py` via `LIMIT`/`OFFSET`; the
  Node route just needs to forward `page`, `per_page`, `sort`, `order` parameters
- The `per_page` and sort preferences can be persisted in `localStorage` so the user
  doesn't need to reconfigure on every visit
- MUI `Pagination` component is available and fits the existing design system
