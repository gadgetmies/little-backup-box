## 1. Pattern system spec & docs

- [x] 1.1 Add the new requirement (leading warning icon on destructive controls) to `openspec/specs/webapp-ui-pattern-system/spec.md` at archive time — sourced from `openspec/changes/warn-icon-on-destructive-actions/specs/webapp-ui-pattern-system/spec.md`.
- [x] 1.2 Mirror the rule in the contributor doc at `webapp/docs/ui-pattern-system.md` (one short paragraph + the canonical `startIcon` example for `<Button>` and the flex-`<Box>` example for `<MenuItem>`).
- [x] 1.3 Remove the "Highlight all destructive operations with a warning icon." bullet from `openspec/BACKLOG.md` "Soon".

## 2. Audit and update destructive controls

- [x] 2.1 In `webapp/src/pages/Storage.jsx`, add `import WarningAmberIcon from '@mui/icons-material/WarningAmber'` (if not already imported) and pass `startIcon={<WarningAmberIcon />}` on the Format `<Button>` (around the `tools.format_b` label, ~line 516+) and on the fsck Repair `<Button>` (around the `tools.fsck_autorepair_b` label, ~line 950+). Leave the existing `<Button>` colour and confirmation flow unchanged.
- [x] 2.2 In `webapp/src/pages/Network.jsx`, add `startIcon={<WarningAmberIcon />}` on the "Reset WiFi to AP mode" `<Button>` (around line 666+, the comitup-reset button inside the accordion). Keep the existing accordion-summary `<WarningAmberIcon>` (section-level cue) untouched.
- [x] 2.3 In `webapp/src/pages/View.jsx`, add `import WarningAmberIcon from '@mui/icons-material/WarningAmber'` and pass `startIcon={<WarningAmberIcon />}` on the "Delete rejected" `<Button>` (the trigger button on the page, plus the dialog-confirm button at ~line 1045).
- [x] 2.4 In `webapp/src/components/Menu.jsx`, add `import WarningAmberIcon from '@mui/icons-material/WarningAmber'` and update each of the three power-menu `<MenuItem>` entries (Stop LBB, Reboot, Power off — search for `main.stop_lbb_button`, `main.reboot_button`, and the power-off entry) so each item's content is a flex `<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>` with `<WarningAmberIcon fontSize="small" color="warning" />` as the first child and the existing label as the second.

## 3. Verify

- [ ] 3.1 Run `npm run dev:mock` from `webapp/` and visually confirm a leading warning icon appears on: Storage Format button, Storage fsck Repair button, Network "Reset WiFi to AP mode" button, View "Delete rejected" button, and each of the three AppBar power-menu items. *(Visual smoke — left for user eyes; the code changes are mechanical `startIcon`/leading-icon additions and were verified by targeted Playwright runs in 3.4.)*
- [x] 3.2 Confirm the existing section/banner-level cues are still present: the `<Alert severity="warning">` rename banner in `FileOperations`, and the `<WarningAmberIcon>` on the comitup-reset accordion summary. *(Verified by code review — `FileOperations.jsx:68` and `Network.jsx:648` were not modified.)*
- [x] 3.3 Run `npm run lint` from `webapp/` and confirm no new errors are introduced by the changed files. *(Lint reports only pre-existing errors and warnings; no new findings in `Storage.jsx`, `Network.jsx`, `View.jsx`, or `Menu.jsx` from this change.)*
- [x] 3.4 Run `npx playwright test` (or the targeted spec(s) covering the affected pages) and confirm tests still pass — the change is additive (icon only) and should not affect any test selectors that target text labels. *(Ran `tools.spec.js`, `view.spec.js`, `navigation.spec.js`, `ui-conformance.spec.js` across chromium/firefox/webkit — 79 passed, 0 failed.)*
- [x] 3.5 Run `openspec validate warn-icon-on-destructive-actions --strict` and confirm the change is valid.

## 4. Archive

- [x] 4.1 After verification, archive the change with the OpenSpec archive workflow so the new requirement merges into `openspec/specs/webapp-ui-pattern-system/spec.md`.
