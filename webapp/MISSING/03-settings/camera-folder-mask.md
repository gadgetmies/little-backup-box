# Settings — Camera Folder Mask

**Priority:** 2 (Important)  
**PHP source:** `scripts/setup.php` lines ~420–460, `config.cfg` key `conf_camera_folder_mask`

---

## What the PHP implementation does

The **camera folder mask** setting (default `DCIM`) controls which top-level folder on the
camera's storage the backup scans.  DSLRs and mirrorless cameras always place images under
`DCIM`; some cameras use a different root (e.g. `PRIVATE` on certain Sony models).  Users
with non-standard cameras can override this to ensure all images are captured.

The value is passed to `backup.py` as the `--folder-mask` argument.

## What the webapp currently has

The Backup settings page (`Settings.jsx` or similar) does not expose this field.
The `config.cfg` key exists on-device but is not editable from the webapp.

## Gap

| PHP capability | Webapp status |
|---|---|
| Camera folder mask input field in settings | Missing |

## Implementation notes

- A single text input in the Backup section of Settings, with `DCIM` as placeholder/default
- Validate that the value contains no path separators (it is a folder name, not a path)
- The existing `conf_*` config-save pattern in the webapp applies directly
