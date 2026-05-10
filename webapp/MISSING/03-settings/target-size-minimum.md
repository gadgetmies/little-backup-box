# Settings — Target Size Minimum

**Priority:** 3 (Useful)  
**PHP source:** `scripts/setup.php` lines ~380–415, `config.cfg` key `conf_min_target_size`

---

## What the PHP implementation does

A numeric input (in GB) sets the **minimum free space** required on the backup target before
a backup is allowed to proceed.  If the target has less free space than this threshold, the
backup is aborted with an error.  This prevents partial backups that silently run out of
space mid-copy.

## What the webapp currently has

Backup settings has move/rename/thumbnails/EXIF/checksum/power-off options but no minimum
target size guard.

## Gap

| PHP capability | Webapp status |
|---|---|
| Minimum target free-space threshold (GB) | Missing |

## Implementation notes

- Numeric input in the Backup section of Settings (GB)
- Config key: `conf_min_target_size`
- The check is performed by `backup.py` at runtime; the setting only needs to be stored
  in config — no frontend logic required beyond the input field
