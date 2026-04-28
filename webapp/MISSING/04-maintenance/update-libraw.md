# Maintenance — Update LibRaw

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/cmd.php` lines ~125–170, command `update_libraw`

---

## What the PHP implementation does

A dedicated "Update LibRaw" action compiles and installs the latest version of LibRaw
(the library used for RAW image decoding).  Output is streamed to the log monitor.
This is separate from the main LBB update because LibRaw releases independently and
the compile step takes several minutes.

## What the webapp currently has

`Maintenance.jsx` / `UpdateManager.jsx` handle only the main LBB update.  There is no
LibRaw update action.

## Gap

| PHP capability | Webapp status |
|---|---|
| Update LibRaw action with log streaming | Missing |

## Implementation notes

- A separate button in the maintenance page, clearly labelled as a long-running build step
- The compile can take 5–15 minutes on a Pi; progress should stream via the existing
  SSE/log-streaming pattern
- A warning that the device will be temporarily unable to process RAW files during the
  install is good UX
