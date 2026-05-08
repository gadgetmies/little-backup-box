## Context

`display-content` is a queue, not a file. Device-side `scripts/lib_display.py:77` writes one `<14-digit-uptime-centisec>.txt` file per displayed frame into `const_DISPLAY_CONTENT_PATH`, then the on-device display daemon (`scripts/display.py`) consumes them in sorted order via `display_content_files.get_ContentFilesList()` (`lib_display.py:131-149`). When the display is disabled, scripts instead write to a single sibling file `display-content-old.txt`.

The webapp's `GET /api/display/status` was written assuming `display-content` is a single file, which has been wrong since the queue mechanism was introduced. The handler's blanket catch hides the EISDIR error, so the failure mode is silent — the alert just never appears.

## Goals / Non-Goals

**Goals:**
- `<DisplayStatus>` shows the most recent message the device-side scripts pushed to the display, on real hardware.
- Behaviour matches the device-side picker: same "lexicographically last" rule the daemon uses to pick the next frame to display.
- No regressions for the mock or for the case where the device is brand-new (no frames written yet).

**Non-Goals:**
- Polling cadence or the alert's visual treatment — both stay as-is.
- The AppBar status icon + dropdown — separate change (next item in BACKLOG.md).
- Real-device verification — covered by a separate manual smoke once the user has a Pi to test on.

## Decisions

### Decision 1: Pick the lexicographically last `.txt` file in the directory

- **Choice**: list `display-content/*.txt`, sort, take the last entry.
- **Why**: matches the device-side daemon's behaviour exactly (`get_ContentFilesList` returns a sorted list and the daemon pops `[0]` after rendering, so the *current frame* is the lowest-numbered remaining one — but the *latest message ever written* is the highest, which is what a "current status" indicator wants). Filenames are 14-digit uptime centiseconds, so lexicographic order matches chronological order.
- **Alternatives**:
  - Read `[0]` (mirror the daemon exactly). Rejected: that's the *next frame to display*, which lags real status during a backlog. The status indicator should reflect the latest known state.
  - `fs.statSync` mtime sort. Rejected: more syscalls; filesystem mtime resolution can collide; the filename ordering is canonical.

### Decision 2: Fall back to `display-content-old.txt` when the directory is empty

- **Choice**: if the directory exists but has no `.txt` files, try reading `display-content-old.txt` from the same `tmp/` parent. If neither yields content, return `{status: ''}`.
- **Why**: when the device's physical display is disabled (`conf_DISP=false`), `lib_display.py:77` writes to `display-content-old.txt` instead of the queue, so falling back ensures the webapp still sees status in that configuration.
- **Alternatives**:
  - Always check both. Rejected: redundant when the queue has frames.
  - Only the queue. Rejected: would silently break for the no-display configuration.

### Decision 3: Add a sibling-file path helper rather than a constant

- **Choice**: extend `webapp/server/utils/paths.js` with a `getDisplayContentOldFilePath(workingDir, constants)` function alongside the existing `getDisplayContentPath`.
- **Why**: the path is already centralised; adding a sibling helper keeps the route handler from hardcoding `'display-content-old.txt'`.

## Risks / Trade-offs

- **[Stale frames]** — On a healthy device the queue is drained quickly so the last `.txt` is recent; on a stuck/crashed daemon the latest queued frame may be minutes old and misleading. **Mitigation**: out of scope here — the current behaviour shows nothing at all, so even a stale frame is strictly better. A "last-modified > N seconds → mark stale" indicator can come with the AppBar refactor.
- **[Read-while-write race]** — Scripts write a new file while the route is mid-read. **Mitigation**: filesystem writes are atomic at the small sizes involved (single `with open(... 'w')` block in Python); the worst case is reading a half-written file once and recovering on the next 1-second poll.
- **[Permissions]** — The Express server runs as a different user than the device-side Python on some setups. **Mitigation**: the previous handler already had `try/catch`; same swallow-and-return-empty behaviour is preserved for any read error.

## Migration Plan

Single commit. No migration steps; no config changes; no schema changes.

## Open Questions

- Should the `<DisplayStatus>` component continue to early-return `null` when status is empty, or render a "Idle" placeholder? Defer to the AppBar status refactor — the per-page Alert going away makes this moot.
