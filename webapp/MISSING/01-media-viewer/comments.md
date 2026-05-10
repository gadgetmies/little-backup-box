# Media Viewer — Image Comments

**Priority:** 2 (Important)  
**PHP source:** `scripts/view.php` lines ~860–920

---

## What the PHP implementation does

In the single-image view there is a **comment textarea** with a character counter.  The
comment is stored in the SQLite `EXIF_DATA` table (`comment` column) and can optionally be
written to the `XMP:Description` EXIF tag via `lib_metadata.py`.  A **"Save ratings"**
button (shared with the rating system) also saves comments.

## What the webapp currently has

No comment field in `View.jsx`.

## Gap

| PHP capability | Webapp status |
|---|---|
| Comment textarea in single-image view | Missing |
| Character counter | Missing |
| Save comment to SQLite | Missing |
| Write comment to EXIF XMP:Description (optional) | Missing |

## Implementation notes

- The save action is naturally bundled with the rating save (same HTTP call)
- Character limit should match the PHP implementation (check `view.php` for the exact limit)
- MUI `TextField multiline` with `inputProps={{ maxLength }}` covers both textarea and counter
