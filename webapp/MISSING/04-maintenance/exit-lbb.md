# Maintenance — Exit LBB

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/cmd.php` lines ~170–200

---

## What the PHP implementation does

An "Exit LBB" action stops the Little Backup Box service (the Python/shell daemon) without
shutting down the Pi.  This is used for troubleshooting or when the user wants to manually
run scripts from a terminal session without LBB interfering.

## What the webapp currently has

No such action in `Maintenance.jsx`.

## Gap

| PHP capability | Webapp status |
|---|---|
| Exit / stop LBB service action | Missing |

## Implementation notes

- Stopping the service will also terminate the Node backend (since it is part of LBB),
  so the webapp will become unresponsive after the action completes — this must be
  communicated to the user before they confirm
- Requires a confirmation dialog
- Lower priority; intended for developers and advanced users only
