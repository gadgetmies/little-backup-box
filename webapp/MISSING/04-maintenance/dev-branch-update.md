# Maintenance — Development Branch Update

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/cmd.php` lines ~60–120, command `update_development`

---

## What the PHP implementation does

A separate "Update (development branch)" action in the maintenance/update section pulls from
the `development` git branch instead of `main`.  It follows the same flow as the standard
update (runs an update script, streams output).

The current branch is shown in the update status area.

## What the webapp currently has

`UpdateManager.jsx` shows the current branch and has a "Check for updates" / "Install update"
button pair, but the install always targets the current branch — there is no way to switch to
the development branch from the webapp.

## Gap

| PHP capability | Webapp status |
|---|---|
| Explicit "install development branch update" action | Missing |

## Implementation notes

- Could be a secondary button in `UpdateManager.jsx`, shown only when the current branch is
  not already `development`, or always shown with a warning label
- The Node backend already calls the update script; it needs a parameter to select the branch
- Consider a confirmation dialog explaining the risks of running development code
