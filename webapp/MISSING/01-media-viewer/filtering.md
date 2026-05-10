# Media Viewer — Filtering & Search

**Priority:** 1 (Critical)  
**PHP source:** `scripts/view.php` lines ~1–180 (filter form)

---

## What the PHP implementation does

The PHP viewer has a persistent filter bar that allows narrowing the image set by:

| Filter | Values |
|---|---|
| Storage medium | dropdown: usb / nvme / internal |
| Date | calendar date picker |
| Rating | dropdown: all / reject (−1) / unrated (0) / 1–5 stars |
| File type | dropdown: all / jpg / raw / heic / video |
| Extension | free-text (e.g. `NEF`, `CR3`) |
| Camera model | dropdown populated from DB |
| Social publish status | dropdown: not set / pending / published |
| Published | dropdown: yes / no |
| Variable field | free-text search across a configurable metadata field |

All filters combine with AND logic and are applied server-side via SQL `WHERE` clauses in
`lib_view.py`.  The filter state round-trips through GET parameters so the URL is bookmarkable.

## What the webapp currently has

`View.jsx` has a free-text input for a storage path.  There is no filter UI and no filtered
query to the backend.

## Gap

| PHP capability | Webapp status |
|---|---|
| Storage medium selector | Missing |
| Date filter | Missing |
| Rating filter | Missing |
| File type / extension filter | Missing |
| Camera model filter | Missing |
| Social publish / published filter | Missing |
| Variable metadata field search | Missing |
| URL-bookmarkable filter state | Missing |

## Implementation notes

- All filter logic is already implemented in `scripts/lib_view.py`; the Node backend only
  needs to pass the parameters through to the Python script
- A collapsed/expandable filter panel (MUI `Accordion`) is consistent with the existing
  webapp style for option-heavy UIs (see `Backup.jsx`)
- The camera-model list can be fetched once on page load from a dedicated endpoint
- Rating filter depends on the rating system being implemented first (see `rating-system.md`)
