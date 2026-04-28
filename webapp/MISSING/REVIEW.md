# Review & Suggested Improvements to the Missing-Features Docs

This document reviews the feature gap documents in `webapp/MISSING/` and suggests
improvements to scope, prioritisation, and implementation guidance.

---

## Overall observations

### 1. The media viewer is dramatically under-specified as a whole

The individual documents (`rating-system.md`, `filtering.md`, `sorting-pagination.md`,
`social-publish.md`, `comments.md`, `delete-rejected.md`, `slideshow.md`,
`magnifying-glass.md`) are written as if these can be implemented independently.  In
practice they share significant state — the image list, the current image index, the filter
parameters, the per-image metadata — and should be designed together as a single
**media viewer rebuild**.

**Suggestion:** Add a top-level `01-media-viewer/OVERVIEW.md` that:
- Describes the full data model (image list + per-image metadata struct)
- Defines the shared API contract between the frontend and the Python backend
- Specifies the component hierarchy (filter bar, grid view, single-image view, toolbar)

Without this, individual features will be implemented with incompatible assumptions about
how state flows and the viewer will be hard to maintain.

---

### 2. Priority 1 should be collapsed to a single work item

Features 1.1–1.5 are all listed as Priority 1, but they have different effort profiles:

- **1.5 (View Database)** can be done entirely on the backend with existing Python scripts
  in a day or two
- **1.1–1.4 (viewer features)** require a significant frontend rebuild

**Suggestion:** Promote **View Database (1.5) to its own "quick win"** category before the
viewer rebuild, and group 1.1–1.4 as a single "Media Viewer Rebuild" epic.  This gives the
user something immediately useful while the bigger viewer work is in progress.

---

### 3. Rating system document conflates storage and display

`rating-system.md` mixes the DB storage concern (SQLite), the optional EXIF write, and the
UI widget into a single document.  The EXIF write is controlled by a separate setting
(`write-rating-to-exif.md`).

**Suggestion:** In `rating-system.md`, separate the description into:
1. The rating widget (frontend only)
2. The DB persist API (backend route)
3. The optional EXIF write (links to `write-rating-to-exif.md` for the setting, notes the
   backend logic lives in `lib_metadata.py`)

---

### 4. `filtering.md` is missing a dependency note on the media viewer state model

The filter bar in PHP submits a form that reloads the page.  The webapp equivalent needs
to hold filter state in React and re-fetch on change.

**Suggestion:** Add a note that the filter state should live at the `View.jsx` page level
(not inside the filter component) so it can drive pagination resets (page back to 1 on
filter change) and be URL-serialised for bookmarking.

---

### 5. Timezone document understates the backend complexity

`timezone.md` says to call `timedatectl set-timezone` — but this requires `sudo` on most
Pi configurations, and the Node backend may not have that privilege.  PHP runs as `www-data`
which typically has a sudoers entry for specific LBB commands.

**Suggestion:** Add a note that the Node backend needs to invoke the same shell script used
by the PHP implementation (`scripts/`) rather than calling `timedatectl` directly,
consistent with the CLAUDE.md script-alignment rule.

---

### 6. `default-backup-mode.md` overstates the matrix size

The document says "~5 sources × ~5 targets = up to 25 cells".  In practice not all
source/target combinations are valid (e.g. Camera → Camera doesn't make sense).

**Suggestion:** Enumerate only the combinations that `index.php` actually exposes
(roughly 8–10 meaningful pairs) and list them explicitly so the implementer isn't
building a general matrix for invalid combinations.

---

### 7. `display-hardware.md` says "extent not fully audited"

This is acknowledged uncertainty left in the document.  It reduces the document's value.

**Suggestion:** Read `webapp/src/components/DisplayConfig.jsx` and do the comparison.
Replace the vague caveat with a concrete field-by-field gap list, the same format used
in the other setting documents.

---

### 8. `exit-lbb.md` notes the webapp will become unresponsive but doesn't address recovery

The document correctly notes the Pi reboots / the service stops.  But it doesn't describe
how the user reconnects.

**Suggestion:** Add a note that after an Exit LBB the user must SSH in or power-cycle to
restart the service.  The confirmation dialog in the UI should say this explicitly.

---

### 9. Priority 3.7 (inline notifications) should be downgraded or removed

The inline Telegram/Matrix sections on the PHP home page are a convenience duplication of
the full settings page.  The webapp's navigation is faster than PHP page loads, so the
justification for this shortcut is weaker.

**Suggestion:** Downgrade to Priority 4 or mark as "Consider removing from scope — full
config available in Service Connections in one navigation step."

---

### 10. Missing: Sepia theme option

`UserInterface.jsx` offers `light / dark / system` themes.  The PHP `setup.php` also offers
a `sepia` theme.  This is not documented as a gap.

**Suggestion:** Add a short `03-settings/sepia-theme.md` noting that the PHP sepia theme
option is absent from the webapp's theme selector.  Low priority, but should not be silently
dropped.

---

### 11. Missing: WiFi info on System page

`sysinfo.php` shows `iwconfig` output (WiFi interface, SSID, frequency, signal level,
bit rate).  `System.jsx` shows system info and camera detection but no WiFi info.
This gap was identified during the analysis but not documented.

**Suggestion:** Add `webapp/MISSING/05-network/wifi-info-sysinfo.md` for this gap.
Priority 3 — useful for diagnosing connectivity issues in the field.

---

### 12. The prioritisation should note that "Priority 1" items all block the viewer

Items 1.1–1.4 are blocking each other in a specific order: you can't usefully implement
filtering (1.2) before there is a working image list with pagination (1.3), and the rating
filter (part of 1.2) needs the rating system (1.1).

**Suggested implementation order within Priority 1:**
1. Sorting + pagination (1.3) — makes the viewer usable with many images
2. Rating system (1.1) — enables reject culling workflow
3. Filtering (1.2) — depends on ratings and list infrastructure
4. Delete rejected (2.4) — depends on rating system
5. Comments (2.5) — independent of above but shares save button
6. Social publish checkboxes (1.4) — depends on configured services

---

## Summary of additional documents to create

| New doc | Reason |
|---|---|
| `01-media-viewer/OVERVIEW.md` | Define shared state model for all viewer features |
| `03-settings/sepia-theme.md` | Sepia theme option missing from webapp |
| `05-network/wifi-info-sysinfo.md` | WiFi info section missing from System page |

## Summary of documents to update

| Doc | Change |
|---|---|
| `01-media-viewer/rating-system.md` | Split into 3 sub-sections; clarify EXIF write dependency |
| `01-media-viewer/filtering.md` | Add note on filter state location and URL serialisation |
| `03-settings/timezone.md` | Note that backend must use existing shell script, not direct timedatectl |
| `03-settings/default-backup-mode.md` | Enumerate valid source/target pairs explicitly |
| `03-settings/display-hardware.md` | Complete the gap by reading DisplayConfig.jsx |
| `04-maintenance/exit-lbb.md` | Add recovery instructions to the confirmation dialog spec |
| `02-backup-home/inline-notifications.md` | Downgrade to Priority 4 or mark out-of-scope |
