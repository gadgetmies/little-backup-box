# Settings — Default Backup Mode Matrix

**Priority:** 3 (Useful)  
**PHP source:** `scripts/setup.php` lines ~440–560, `config.cfg` keys `conf_default_backup_*`

---

## What the PHP implementation does

A matrix of dropdowns in the Backup settings section lets the user configure the **default
backup mode** for every source/target combination independently.  For example:

- Camera → USB: Copy
- Camera → NVMe: Move
- USB → Internal: Copy + secondary to cloud
- etc.

The defaults are applied when a new backup is started from the home page before the user
changes anything.  A secondary backup destination can also be configured per combination
(the PHP home page has a secondary backup selector that reads these defaults).

## What the webapp currently has

The Backup settings page has individual toggles for move/rename/thumbnails/EXIF/checksum/
power-off, but no source-×-target default mode matrix.

## Gap

| PHP capability | Webapp status |
|---|---|
| Default backup mode per source/target combination | Missing |
| Default secondary backup destination per combination | Missing |

## Implementation notes

- The matrix has ~5 sources × ~5 targets = up to 25 cells; render as a scrollable table or
  a grouped set of select inputs
- Config keys follow the `conf_default_backup_<source>_<target>` pattern
- This is more useful for power users who run varied backup workflows; casual users who
  always back up camera → USB may not need it
