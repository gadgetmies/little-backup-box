# Media Viewer — Delete Rejected Images

**Priority:** 2 (Important)  
**PHP source:** `scripts/view.php` lines ~1050–1120

---

## What the PHP implementation does

A **"Delete rejected images"** button is shown in the viewer toolbar.  When clicked (with a
confirmation prompt), all images on the currently selected storage medium whose rating is −1
(reject) are permanently deleted from disk.  The corresponding database records are also
removed.

This is a key part of the culling workflow: shoot → back up → rate rejects in the viewer →
delete rejects in bulk → copy keepers elsewhere.

## What the webapp currently has

No delete functionality of any kind in `View.jsx`.

## Gap

| PHP capability | Webapp status |
|---|---|
| Bulk delete of rejected images | Missing |
| Confirmation dialog before deletion | Missing |
| DB record cleanup after deletion | Missing |

## Implementation notes

- Depends on the rating system (see `rating-system.md`) being implemented
- The action is destructive; a MUI `Dialog` confirmation is mandatory
- The Node backend route should call the Python script (or a shell command) that handles
  the file removal and DB cleanup, consistent with the script-alignment rule in CLAUDE.md
- Scope: only images marked −1 on the currently viewed medium; do not expose a
  "delete all" shortcut
