## 1. Reorder the Default backup modes matrix

- [x] 1.1 In `webapp/src/pages/Preferences.jsx` (matrix render block at lines 311–367), change the `sources` array literal from `['camera', 'usb', 'internal', 'nvme']` to `['usb', 'internal', 'nvme', 'camera']`. Leave `targets` and `validCombinations` unchanged.

## 2. Encode the rule in the pattern system

- [x] 2.1 In `openspec/specs/webapp-ui-pattern-system/spec.md`, add the new `Symmetric source/target matrices align shared axes at the same index` requirement (with all four scenarios from the change's spec delta). Place it in topical order — alongside the other "render this kind of thing this way" rules (e.g. near the destructive-actions / Card-vs-Accordion rules), not at the end of the file. (This is what the change's `specs/webapp-ui-pattern-system/spec.md` delta becomes after `openspec archive` runs; the apply step does NOT yet edit the canonical spec — that happens at archive time. This task is a placeholder reminder to confirm the delta wording reads correctly when archived.)

- [x] 2.2 In `webapp/docs/ui-pattern-system.md`, add a short prose section titled "Symmetric source/target matrices" that mirrors the rule from the spec: shared subset at identical indices on both axes, source-only rows last, target-only columns last, self-pair empties form the diagonal. Reference `openspec/specs/webapp-ui-pattern-system/spec.md` as the formal source, the way the existing rules in this doc do.

## 3. Verify nothing else breaks

- [x] 3.1 Run `npm run lint` from `webapp/` and confirm there are no new errors introduced by the `Preferences.jsx` change. (Pre-existing errors in untouched files are tracked separately on the backlog.)

- [x] 3.2 Grep `webapp/tests/e2e/` for `default_backup_mode`, `source_camera`, `target_camera`, `target_usb`, and any matrix selector that depends on row/column index (`nth-child`, indexed `getByRole('row')`, etc.). If a test selects the camera row by position, update it to select by label, by `data-testid`, or by the source identifier. If no positional selectors are found, no test changes are needed; record that finding in the change notes.

- [x] 3.3 Run `npm run test:e2e` from `webapp/` and confirm the suite stays green (or matches whatever the baseline status is on the current branch). If a test breaks because of the row reorder, fix it under the same change — do not skip.

- [x] 3.4 Manually verify the matrix renders as expected: `npm run dev:mock` from `webapp/`, open `/preferences`, scroll to the "Default backup modes" section, confirm the rows now render in order `usb, internal, nvme, camera` and that the (usb, usb), (internal, internal), (nvme, nvme) cells are blank along the top-left-to-bottom-right diagonal of the shared 3×3 sub-grid.

## 4. Backlog cleanup

- [x] 4.1 In `openspec/BACKLOG.md` "Soon" section, remove the bullet starting with `**Order the default-backup-modes table so columns and rows match.**` (and its full body paragraph). Do not move it to "Won't do" — the change resolves it.

## 5. Archive

- [x] 5.1 Once tasks 1–4 are complete and committed, run `openspec archive align-default-backup-mode-matrix-axes` (the archive step renames the change directory with today's date prefix and applies the spec delta to `openspec/specs/webapp-ui-pattern-system/spec.md`). Confirm the change directory ends up under `openspec/changes/archive/<YYYY-MM-DD>-align-default-backup-mode-matrix-axes/` and the canonical spec now contains the new requirement in topical order.
