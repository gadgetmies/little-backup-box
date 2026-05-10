# Settings — Write Star Rating to EXIF

**Priority:** 2 (Important)  
**PHP source:** `scripts/setup.php` lines ~620–640, `config.cfg` key `conf_write_exif_rating`

---

## What the PHP implementation does

A toggle that, when enabled, causes the rating saved in the media viewer to also be written
to the image file's `XMP:Rating` EXIF tag via `lib_metadata.py`.  This makes ratings
portable — they survive if the LBB database is lost and appear in Lightroom, Capture One,
etc. when the files are later imported.

## What the webapp currently has

No such setting.  The rating system itself is also missing (see `rating-system.md`), but this
setting is a prerequisite for the full feature to match PHP.

## Gap

| PHP capability | Webapp status |
|---|---|
| Toggle: write rating to XMP:Rating EXIF tag | Missing |

## Implementation notes

- Single boolean toggle, standard `conf_*` config pattern
- Place in the Image Viewer sub-section of Settings
- Depends on the rating system being implemented (see `01-media-viewer/rating-system.md`)
