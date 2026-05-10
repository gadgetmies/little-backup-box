# Plan 5 — Media Viewer: Slideshow & Zoom

**Effort:** ~1 day  
**Depends on:** Plan 2 (viewer foundation)  
**Can be developed in parallel with Plans 3 & 4**

---

## What this plan delivers

- Slideshow: auto-advances through images matching current filters, configurable interval
- Magnifying glass: loads full-resolution image on demand with zoom and pan

---

## Slideshow

### UI

A play/stop `IconButton` in the single-image view toolbar. Next to it: a small `TextField`
(type `number`, width ~80px) for the interval in seconds (default 5, min 1, max 60).

The interval input is only enabled when the slideshow is stopped.

### Behaviour

- Slideshow advances through the image list in sort order, respecting active filters
- On reaching the last image it wraps to the first
- Pauses automatically when the user manually navigates (Prev/Next buttons or keyboard)
- Stops when the user exits single-image view (back to grid)
- Implemented entirely in the frontend using `setInterval` — no backend call

### Implementation

```js
const slideshowRef = useRef(null);

const startSlideshow = () => {
  slideshowRef.current = setInterval(() => {
    setSelectedIndex(i => (i + 1) % images.length);
  }, intervalSeconds * 1000);
};

const stopSlideshow = () => {
  clearInterval(slideshowRef.current);
};
```

Cleanup in `useEffect` return to prevent memory leaks.

---

## Magnifying glass (zoom & pan)

### UI

A `ZoomIn` `IconButton` in the single-image view toolbar. Toggles zoom mode on/off.

In zoom mode:
- Full-resolution image is loaded (lazy, only when first toggled on)
- CSS `transform: scale(zoomLevel)` with `transformOrigin` based on pointer position
- Mouse wheel or pinch-to-zoom changes `zoomLevel` (1×–8×)
- Click-and-drag pans the image
- `ZoomOut` / `ZoomIn` buttons also available for keyboard users
- Clicking outside or pressing Escape exits zoom mode

### Full-resolution image URL

The thumbnail URL pattern (from Plan 2 fixture data) is:
```
/api/view/thumbnail?medium=usb&id=<imageId>
```

Full-res URL:
```
/api/view/image?medium=usb&id=<imageId>
```

Add this route to `view.js`: streams the original image file from disk. The route already
exists as the download endpoint in PHP (`view.php` download link) — check and align.

### Loading state

Full-res load uses `useAsyncAction` with `loadingDelay: 800ms` (images are large — the delay
prevents a spinner flash on fast connections while still showing progress on slow WiFi).

If the full-res file is missing (original deleted, thumbnail exists): show inline Alert
"Original file not available" and remain in thumbnail view.

---

## No new backend routes required for slideshow

Slideshow uses the already-fetched image list. Only the full-res image serving route is new.

```
GET /api/view/image?medium=<m>&id=<imageId>
  Streams the original image file from disk
  Returns: image binary (content-type based on extension)
```

---

## Mock additions

`GET /api/view/image` → returns a placeholder full-resolution image (e.g. a larger version
of the fixture thumbnail). Applies the configured mock delay.

Failure modes:
- `network_timeout` on full-res load → Alert "Original file not available", zoom button disabled
- Image file missing (custom: `file_missing`) → same Alert

---

## Verification

### 1. Static
- `npm run lint && npm run build` pass

### 2. Mock UI (`npm run dev:mock`)
- Single-image view shows play button and interval input
- Clicking play starts slideshow — images advance every 5 seconds
- Interval input disabled during playback
- Manually clicking Prev/Next pauses slideshow (play button becomes active again)
- Exiting to grid stops slideshow
- Change interval to 2 seconds → advances faster
- Set delay 3000ms → slideshow still advances on timer (interval is client-side only)
- Zoom button visible in single-image toolbar
- Click zoom → full-res image loads (larger placeholder), zoom mode active
- Mouse wheel increases/decreases zoom level (1×–8×)
- Click-drag pans zoomed image
- Click zoom button again (or Escape) → exits zoom mode
- Enable `file_missing` failure → Alert "Original file not available" on zoom click
- Play button with `file_missing` active → slideshow still works (uses thumbnail)

### 3. E2E tests (`webapp/tests/e2e/view-slideshow-zoom.spec.js`)
- Play button starts and stops slideshow
- Zoom button loads full-res image
- file_missing failure shows correct Alert

### 4. Real hardware
- Slideshow advances through backed-up images on USB
- Zoom loads full-resolution RAW preview
- Pinch-to-zoom works on mobile browser
