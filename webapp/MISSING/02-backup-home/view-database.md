# Backup Home — View Database Section

**Priority:** 1 (Critical)  
**PHP source:** `scripts/index.php` lines ~300–420

---

## What the PHP implementation does

Below the backup controls, the home page has a **"View Database"** section that applies to
already-backed-up media (not a live backup operation).  The user selects a storage target
(USB / internal / NVMe) and can trigger:

| Action | What it does |
|---|---|
| Generate thumbnails | Runs `lib_view.py` to create JPEG thumbnails for all images on the selected medium that do not yet have one |
| Sync database | Scans the medium, adds new files to the SQLite DB and removes records for deleted files |
| Update EXIF data | Re-reads EXIF tags from all image files on the medium and updates the DB |

Each action streams its log output to the page (same log-monitor pattern as backup).  These
operations are essential for viewing images in the media viewer after a backup.

## What the webapp currently has

`Backup.jsx` has source/target selection, the backup options accordion, and the running/history
sections.  There is **no View Database section**.

## Gap

| PHP capability | Webapp status |
|---|---|
| Target medium selector for DB operations | Missing |
| Generate thumbnails action | Missing |
| Sync database action | Missing |
| Update EXIF data action | Missing |
| Log streaming for these operations | Missing |

## Implementation notes

- The underlying Python scripts (`lib_view.py`, `lib_metadata.py`) already exist
- The Node backend already has patterns for spawning scripts and streaming log output
  (used by the backup runner); the same approach applies here
- These three actions are independent; they can be three separate buttons that each disable
  while running
- Place in `Backup.jsx` below the main backup controls, consistent with PHP layout
