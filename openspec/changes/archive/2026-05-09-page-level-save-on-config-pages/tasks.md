## 1. Pre-flight

- [x] 1.1 Confirm the existing `onSavedStateChange(isSaved, handleSave)` contract by re-reading `webapp/src/components/CloudConfig.jsx:51-77, 121-143` and `webapp/src/components/SocialMediaConfig.jsx:90-118`. Note any subtle differences (e.g., when `isSaved` flips back to `true` after save) so the new components behave the same.
- [x] 1.2 Inventory every place a `useEffect` or onChange handler calls `updateConfig` on these three pages and their sub-components. The list (from the survey): `Connections.jsx:205-231` (social general), `Connections.jsx:260-288` (cloud per-remote, the buggy one), `Network.jsx:406-411` (WiFi country), `DisplayConfig.jsx:94`, `ButtonHardwareConfig.jsx:71`, `FanConfig.jsx:29, 41`. Confirm none have been added since the survey.

## 2. Shared `<PageSaveBar>` primitive

- [x] 2.1 Create `webapp/src/components/PageSaveBar.jsx` exporting a default-export component with props `(isDirty: boolean, isSaving: boolean, onSave: () => void, drawerWidth: number, secondaryAction?: ReactNode)`. Render a `Stack direction="row"` fixed at `bottom: 0` with the same drawer-width offset on `md+` viewports as the existing inline bars in `Connections.jsx:646-668`. Save button uses `<SaveIcon />`; shows a `<CircularProgress size={16} />` in place of the icon when `isSaving`; `disabled` when `!isDirty || isSaving`. The label is `t('config.save_button') || 'Save'`.
- [x] 2.2 Z-index: match the MockControls panel's "drop below MUI's modal layer" treatment from commit `db75af2`. Use the same numeric value (or a shared constant if one exists).

## 3. Sub-component conversion: `<DisplayConfig>`

- [x] 3.1 Convert `webapp/src/components/DisplayConfig.jsx`: replace the per-field `updateConfig` calls with internal `formData` state. Add `lastSavedConfig` ref. Add `handleSave` that posts the full `formData`. Accept a new `onSavedStateChange(isSaved, handleSave)` prop and wire it up (callback fires whenever isSaved transitions, mirroring `CloudConfig.jsx:121-143`).
- [x] 3.2 Verify the existing field-level controls still update the in-memory `formData` and visibly re-render. No autosave should fire on any onChange.

## 4. Sub-component conversion: `<ButtonHardwareConfig>`

- [x] 4.1 Same conversion as 3.1 against `webapp/src/components/ButtonHardwareConfig.jsx`.

## 5. Sub-component conversion: `<FanConfig>`

- [x] 5.1 Same conversion as 3.1 against `webapp/src/components/FanConfig.jsx`.

## 6. Sub-component conversion: `<VPNConfig>`

- [x] 6.1 Add `lastSavedConfig` ref + dirty-tracking `useEffect` to `webapp/src/components/VPNConfig.jsx` for its three form fields (`conf_VPN_TYPE_RSYNC`, `conf_VPN_TYPE_CLOUD`, `conf_VPN_TIMEOUT`). Add `onSavedStateChange(isSaved, handleSave)` prop and call it whenever `isSaved` transitions, mirroring `CloudConfig.jsx`.
- [x] 6.2 Drop the inline `<Button onClick={handleSave}>` at `VPNConfig.jsx:237-245` — the page-level Save now invokes `handleSave` via the callback.
- [x] 6.3 Leave the file-upload `<Button>` (line 196-210) and the remove buttons (line 217-233) untouched — they call `POST /vpn/upload` / `POST /vpn/remove` directly and are intentionally event-driven (transactional immediate-effect actions, not config saves). They are independent of the page Save bar.

## 7. Sub-component cleanup: `<CloudConfig>` and `<SocialMediaConfig>`

- [x] 7.1 Remove the inline `<Button onClick={handleSave}>` at `CloudConfig.jsx:324`. The component's `handleSave` is still exposed via `onSavedStateChange`; the page calls it.
- [x] 7.2 Remove the inline `<Button onClick={handleSave}>` at `SocialMediaConfig.jsx:497`. Same rationale.

## 8. Page conversion: `/hardware`

- [x] 8.1 Rewrite `webapp/src/pages/Hardware.jsx` to track three save-state refs (one per sub-component, e.g. `displayState`, `buttonsState`, `fanState`), compute `isAnyDirty`, and render `<PageSaveBar>` once at the bottom of the `<Box>` (outside `<TabPanel>`s so it shows on every tab). Pass the page-level Save handler `() => Promise.all([displayState, buttonsState, fanState].filter(s => !s.isSaved && s.save).map(s => s.save()))`.
- [ ] 8.2 Verify on dev: editing any field on any tab enables the bar; clicking Save persists and disables the bar; switching tabs while dirty keeps the bar enabled.

## 9. Page conversion: `/network`

- [x] 9.1 Convert `Network.jsx`: replace `currentWifiCountry` + `handleWifiCountryChange` with internal `formData` state mirroring `conf_WIFI_COUNTRY` (and any other autosave fields uncovered in 1.2). Add `wifiState` save-state ref. Wire `<VPNConfig>` to a `vpnState` save-state ref via the new `onSavedStateChange` prop. Render `<PageSaveBar>` once.
- [ ] 9.2 Manual verify same as 8.2.

## 10. Page conversion: `/integrations` (Connections)

- [x] 10.1 Rewrite the autosave `useEffect` for cloud-remote (`Connections.jsx:260-288`): drop the autosave entirely; replace with a `cloudRemoteState` save-state ref tracking `isSaved` (computed from `JSON.stringify(cloudRemoteFormData) === lastSavedSnapshot.current`) and a `handleSave` that posts the per-remote config keys.
- [x] 10.2 Rewrite the autosave `useEffect` for social-general (`Connections.jsx:205-231`): same conversion. Drop the autosave; expose `socialGeneralState`.
- [x] 10.3 Drop the inline Mail Save button (`Connections.jsx:670-687`); expose `mailState` save-state and reuse the existing `handleSaveMail`.
- [x] 10.4 Drop the inline Rsync Save button (`Connections.jsx:880-913`); expose `rsyncState` save-state and reuse `handleSaveRsync`. The Rsync section's existing `useEffect` for autosave (`Connections.jsx:142-192`) needs to be reduced to dirty-tracking only (compute `isSaved`, no setTimeout, no `updateConfig`).
- [x] 10.5 Replace the two inline sticky `<Stack>`s with a single `<PageSaveBar>` at the page level. The Mail tab's "Send Test Mail" button rides along as `secondaryAction` (only visible when the Mail tab is active, since it depends on `currentTab === 2`).
- [x] 10.6 Page-level Save calls `Promise.all` over `[mailState, rsyncState, cloudRemoteState, socialGeneralState, cloudConfigRef.current, socialMediaConfigRef.current]` — preserving the existing ref pattern for `CloudConfig` and `SocialMediaConfig`.
- [ ] 10.7 Manual verify: load `/integrations`, confirm zero network calls and zero toasts. Edit a field on Mail, switch to Cloud tab, edit a field on rsync, click Save once, confirm exactly two `POST /api/config/save` requests fire (or one merged — depends on implementation), confirm one toast, confirm the Save button disables.

## 11. i18n

- [x] 11.1 Verify `config.save_button` exists in all five language files (it does, used by Mail/Rsync today). No new keys needed unless 2.1 / 8.1 / 9.1 / 10.5 surfaces a gap.

## 12. E2E tests

- [x] 12.1 Add `webapp/tests/e2e/connections-no-spurious-save.spec.js`: navigate to `/integrations`, wait for `networkidle`, assert that **zero** `POST /api/config/save` requests occurred during the load. Use `page.on('request')` and an array. Repeat for `/network` and `/hardware`.
- [x] 12.2 Add `webapp/tests/e2e/page-level-save.spec.js` with one test per page: load the page, edit one field on one tab, switch tab, edit another field, click Save, assert exactly the expected request(s) fire and the toast appears. Confirm the Save button transitions `disabled → enabled → saving → disabled` correctly.
- [x] 12.3 Verify the existing `tests/e2e/integrations-tabs.spec.js`, `tests/e2e/hardware-tabs.spec.js`, `tests/e2e/preferences-tabs.spec.js`, `tests/e2e/maintenance-tabs.spec.js` still pass — tab navigation should be unaffected.

## 13. Validate

- [x] 13.1 `cd webapp && npm run lint` — fix any new errors introduced by this change.
- [x] 13.2 `cd webapp && npm run check:i18n` — parity intact.
- [x] 13.3 `cd webapp && npx playwright test tests/e2e/connections-no-spurious-save.spec.js tests/e2e/page-level-save.spec.js tests/e2e/integrations-tabs.spec.js tests/e2e/hardware-tabs.spec.js tests/e2e/preferences-tabs.spec.js --project=chromium` — all pass.

## 14. Backlog hygiene

- [x] 14.1 No backlog item maps to this change directly (the user raised it ad hoc), so nothing to remove.
