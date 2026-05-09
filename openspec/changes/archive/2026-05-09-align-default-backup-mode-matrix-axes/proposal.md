## Why

The "Default backup modes" matrix on `/preferences` (`Preferences.jsx:311-`) lays out source rows against target columns, with empty cells for invalid combinations. The shared subset (`usb`, `internal`, `nvme`) is a valid source AND a valid target, so the (source == target) cells (e.g. usb→usb, internal→internal, nvme→nvme) are intentionally blank — but today those blanks land on an *off-diagonal* of the rendered table because the source list is offset by `camera` (`sources = ['camera', 'usb', 'internal', 'nvme']`, `targets = ['usb', 'internal', 'nvme', 'cloud', 'rsync']`). A reader scanning the table sees the empty cells form a diagonal that means nothing structural — it is a coincidence of the offset, not a "you can't back up X to itself" cue. Aligning the shared subset at the same index on both axes turns the empty cells into a meaningful diagonal and makes the "X→X is not a thing" pattern visible at a glance.

## What Changes

- In `webapp/src/pages/Preferences.jsx` (the `Default backup modes` matrix render block at lines 311–367), reorder the `sources` array from `['camera', 'usb', 'internal', 'nvme']` to `['usb', 'internal', 'nvme', 'camera']`. Leave `targets` (`['usb', 'internal', 'nvme', 'cloud', 'rsync']`) and the `validCombinations` set unchanged, since they already place the shared subset at indices 0/1/2 and the camera-as-source-only valid combos are still correct.
- After the change, the rendered table puts the shared subset in identical positions on both axes:
  - row 0 = col 0 = `usb`
  - row 1 = col 1 = `internal`
  - row 2 = col 2 = `nvme`
  - row 3 = `camera` (source-only, no matching column)
  - cols 3, 4 = `cloud`, `rsync` (target-only, no matching row)
  Empty cells under (usb, usb), (internal, internal), (nvme, nvme) now form a true diagonal in the shared 3×3 sub-grid.
- Note: the backlog's literal example said "put `camera` first as a row-only header". Camera-first cannot satisfy "shared types align at the same index" without inserting an empty placeholder column for camera (visually awkward) or rendering camera in a separate header band (a much bigger restructure). Camera-last is the minimal change that achieves the stated goal — making the diagonal meaningful — and keeps camera as a clearly source-only row, just at the bottom of the matrix instead of the top.
- Remove the corresponding bullet from `openspec/BACKLOG.md` "Soon" in the same change.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `webapp-ui-pattern-system`: adds a "symmetric source/target matrix" rule so any current or future grid where rows and columns share a subset of types renders that subset at the same index on both axes. Today's only call site is the Default backup modes matrix, but the rule belongs in the pattern system rather than as an ad-hoc convention so the next analogous grid composes the same affordance.

## Impact

- Affected files:
  - `webapp/src/pages/Preferences.jsx` — change `sources` array order
  - `openspec/specs/webapp-ui-pattern-system/spec.md` — add the symmetric-matrix rule (via the change's `specs/` delta at archive time)
  - `webapp/docs/ui-pattern-system.md` — mirror the rule in the contributor doc, alongside the existing rules
  - `openspec/BACKLOG.md` — remove the "Order the default-backup-modes table" bullet from "Soon"
- No backend / API / config changes. No translation key changes (the same `config.source_*` and `config.target_*` keys are used; only their render order changes).
- No data migrations. The `conf_default_backup_<source>_<target>` config keys persist unchanged.
- Visual change only — same set of cells, same valid combinations, same select options, same persistence, just with `camera` rendered as the bottom row instead of the top.
- E2E impact: any Playwright test that selected matrix cells by row position needs to be re-checked. A grep for `default_backup_mode` and `source_camera` across `tests/e2e/` should turn up affected tests; if none are matrix-position-sensitive, no test changes are needed.
