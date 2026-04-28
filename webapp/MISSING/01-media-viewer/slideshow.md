# Media Viewer — Slideshow

**Priority:** 3 (Useful)  
**PHP source:** `scripts/view.php` lines ~970–1030

---

## What the PHP implementation does

A **slideshow** button in the single-image toolbar starts an auto-advancing slideshow.
The interval (in seconds) is configurable via a numeric input next to the button.
The slideshow advances through all images matching the current filter and wraps around.

## What the webapp currently has

No slideshow in `View.jsx`.

## Gap

| PHP capability | Webapp status |
|---|---|
| Slideshow start/stop toggle | Missing |
| Configurable interval | Missing |
| Wraps around to first image | Missing |

## Implementation notes

- Implemented entirely in the frontend with `setInterval` — no backend call required
- The interval input can be a small `TextField` next to the play button
- Slideshow should pause when the user manually navigates or closes the single-image view
