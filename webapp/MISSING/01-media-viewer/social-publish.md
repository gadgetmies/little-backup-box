# Media Viewer — Social Publish Checkboxes

**Priority:** 1 (Critical)  
**PHP source:** `scripts/view.php` lines ~800–950

---

## What the PHP implementation does

In the single-image view, below the image there is a row of checkboxes — one per configured
social media service (Telegram, Mastodon, Bluesky, Matrix).  Checking a box marks that image
as "pending publish" for that service.  The publish status is stored in the SQLite
`EXIF_DATA` table and read back on subsequent views.

The filter system (see `filtering.md`) can filter by publish status (pending / published),
making it easy to find images queued for sharing.

## What the webapp currently has

No social publish UI in `View.jsx`.  Social media services are configurable in
`ServiceConnections.jsx` but there is no per-image publish workflow.

## Gap

| PHP capability | Webapp status |
|---|---|
| Per-service publish checkbox in single-image view | Missing |
| Persist publish status to SQLite | Missing |
| Filter by publish / published status in viewer | Missing (also covered in filtering.md) |

## Implementation notes

- Service list can be fetched from the existing service-connections config endpoint
- Only services that are configured and enabled should show checkboxes
- The MUI `Checkbox` with a service icon/name label is the natural component
- Saving publish state reuses the same DB-write pattern as the rating system
