# Missing Functionality — Webapp vs PHP Implementation

This document is a top-level index of features present in the PHP implementation
that are absent or incomplete in the React/Node webapp.

Features are ordered by **expected utility for a DSLR / mirrorless / mobile camera
user working on the go** (Priority 1 = most impactful).

---

## Table of Contents

### Priority 1 — Critical for core photo-review workflow

| # | Feature area | Doc |
|---|---|---|
| 1.1 | Media viewer — rating & reject system | [01-media-viewer/rating-system.md](01-media-viewer/rating-system.md) |
| 1.2 | Media viewer — filtering & search | [01-media-viewer/filtering.md](01-media-viewer/filtering.md) |
| 1.3 | Media viewer — sorting & pagination | [01-media-viewer/sorting-pagination.md](01-media-viewer/sorting-pagination.md) |
| 1.4 | Media viewer — social publish checkboxes | [01-media-viewer/social-publish.md](01-media-viewer/social-publish.md) |
| 1.5 | Backup home — View Database section | [02-backup-home/view-database.md](02-backup-home/view-database.md) |

### Priority 2 — Important operational features

| # | Feature area | Doc |
|---|---|---|
| 2.1 | Backup home — File Operations (rename stored files) | [02-backup-home/file-operations.md](02-backup-home/file-operations.md) |
| 2.2 | Settings — camera folder mask | [03-settings/camera-folder-mask.md](03-settings/camera-folder-mask.md) |
| 2.3 | Settings — write star rating to EXIF | [03-settings/write-rating-to-exif.md](03-settings/write-rating-to-exif.md) |
| 2.4 | Media viewer — delete rejected images | [01-media-viewer/delete-rejected.md](01-media-viewer/delete-rejected.md) |
| 2.5 | Media viewer — comment field | [01-media-viewer/comments.md](01-media-viewer/comments.md) |

### Priority 3 — Useful configuration & UX

| # | Feature area | Doc |
|---|---|---|
| 3.1 | Settings — idle power-off timer | [03-settings/idle-power-off.md](03-settings/idle-power-off.md) |
| 3.2 | Settings — default backup mode matrix | [03-settings/default-backup-mode.md](03-settings/default-backup-mode.md) |
| 3.3 | Settings — background image | [03-settings/background-image.md](03-settings/background-image.md) |
| 3.4 | Settings — timezone selector | [03-settings/timezone.md](03-settings/timezone.md) |
| 3.5 | Settings — popup messages toggle | [03-settings/popup-messages.md](03-settings/popup-messages.md) |
| 3.6 | Settings — target size minimum | [03-settings/target-size-minimum.md](03-settings/target-size-minimum.md) |
| 3.7 | Backup home — inline Telegram / Matrix sections | [02-backup-home/inline-notifications.md](02-backup-home/inline-notifications.md) |
| 3.8 | Media viewer — slideshow | [01-media-viewer/slideshow.md](01-media-viewer/slideshow.md) |
| 3.9 | Media viewer — magnifying glass | [01-media-viewer/magnifying-glass.md](01-media-viewer/magnifying-glass.md) |

### Priority 4 — Advanced / hardware / maintenance

| # | Feature area | Doc |
|---|---|---|
| 4.1 | Maintenance — development branch update | [04-maintenance/dev-branch-update.md](04-maintenance/dev-branch-update.md) |
| 4.2 | Maintenance — update libraw | [04-maintenance/update-libraw.md](04-maintenance/update-libraw.md) |
| 4.3 | Maintenance — Exit LBB | [04-maintenance/exit-lbb.md](04-maintenance/exit-lbb.md) |
| 4.4 | Network — Comitup reset | [05-network/comitup-reset.md](05-network/comitup-reset.md) |
| 4.5 | Settings — cloud per-service configuration | [03-settings/cloud-per-service.md](03-settings/cloud-per-service.md) |
| 4.6 | Settings — social media general settings | [03-settings/social-general.md](03-settings/social-general.md) |
| 4.7 | Settings — display hardware (e-ink / OLED) | [03-settings/display-hardware.md](03-settings/display-hardware.md) |
| 4.8 | Settings — menu / button hardware | [03-settings/menu-button-hardware.md](03-settings/menu-button-hardware.md) |
| 4.9 | Settings — fan / GPIO configuration | [03-settings/fan-gpio.md](03-settings/fan-gpio.md) |
| 4.10 | Settings — debug section | [03-settings/debug.md](03-settings/debug.md) |

---

## Scope

The PHP reference implementation lives in `scripts/` (primarily `index.php`, `view.php`,
`setup.php`, `tools.php`, `sysinfo.php`, `cmd.php`).  
The webapp lives in `webapp/src/` (React frontend) and `webapp/server/` (Node/Express backend).

Files in `webapp/PLANS/` and `webapp/IMPLEMENTATION_DIFFERENCES.md` were **not** consulted
during this analysis — everything below is derived directly from reading the PHP and React source.
