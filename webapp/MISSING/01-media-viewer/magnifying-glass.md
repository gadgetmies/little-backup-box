# Media Viewer — Magnifying Glass

**Priority:** 3 (Useful)  
**PHP source:** `scripts/view.php` lines ~1035–1060

---

## What the PHP implementation does

In the single-image view a **magnifying glass** button loads the full-resolution image (not
the thumbnail) and renders it in a pannable/zoomable overlay.  This allows the user to
inspect sharpness, focus, and detail without downloading the file.

## What the webapp currently has

No zoom or pan capability in `View.jsx`.

## Gap

| PHP capability | Webapp status |
|---|---|
| Full-resolution image load on demand | Missing |
| Zoom / pan in single-image view | Missing |

## Implementation notes

- The full-resolution file is already served via the existing image-serving endpoint; only
  the URL parameter (`thumb=0` or similar) needs to change
- A CSS `transform: scale()` approach with mouse/touch drag for pan is lightweight and
  avoids a heavy library dependency
- Alternatively, a small library like `react-medium-image-zoom` adds this with minimal code
- Loading the full-res image should be lazy (on button click), not automatic, to avoid
  slow loads over the device's WiFi AP
