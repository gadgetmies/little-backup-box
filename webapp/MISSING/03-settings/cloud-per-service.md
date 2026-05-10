# Settings — Cloud Per-Service Configuration

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/setup.php` lines ~1100–1250, `config.cfg` keys `conf_cloud_*`

---

## What the PHP implementation does

For each configured cloud storage provider (rclone remote), the settings page exposes:

| Setting | Description |
|---|---|
| Target base directory | Remote path on that cloud service where files are stored |
| Sync method | rclone (default) or rsync |
| Files stay in place | Toggle: if enabled, files are not removed from local after cloud sync |

These can differ per-cloud; e.g. Dropbox might sync to `/Camera` while Google Drive uses
`/Backups/LBB`.

## What the webapp currently has

`ServiceConnections.jsx` has a Cloud Services tab that allows adding/removing rclone remotes
and testing connections, but does not expose the per-remote backup behaviour settings above.

## Gap

| PHP capability | Webapp status |
|---|---|
| Per-cloud target base directory | Missing |
| Per-cloud sync method (rclone / rsync) | Missing |
| Per-cloud files-stay-in-place toggle | Missing |

## Implementation notes

- These settings belong in the Cloud Services tab of `ServiceConnections.jsx` or in a
  dedicated Cloud section of Settings
- For each configured rclone remote, show an expandable row with the three fields above
- Config keys follow the `conf_cloud_<remote_name>_*` pattern
