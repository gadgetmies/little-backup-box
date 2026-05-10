# Backup Home — File Operations Section

**Priority:** 2 (Important)  
**PHP source:** `scripts/index.php` lines ~420–500

---

## What the PHP implementation does

A **"File Operations"** section on the home page allows the user to rename files on a
selected storage medium.  The user picks a target medium, specifies a rename pattern (using
date/camera/sequence tokens), and runs the rename.  Progress is streamed to the log monitor.

This is useful for standardising filenames across cameras (e.g. `DSCF1234.RAF` →
`2024-05-01_001.RAF`) after the backup has already completed.

## What the webapp currently has

No file operations section in `Backup.jsx`.

## Gap

| PHP capability | Webapp status |
|---|---|
| Target medium selector | Missing |
| Rename pattern input | Missing |
| Run rename action | Missing |
| Log streaming for rename | Missing |

## Implementation notes

- Rename logic is handled by an existing Python/shell script; the Node backend only needs
  to invoke it with the right parameters
- The rename pattern tokens (date, camera model, sequence) should be documented with a
  tooltip or expandable help text since users unfamiliar with the syntax will be confused
- Place in `Backup.jsx` below the View Database section
