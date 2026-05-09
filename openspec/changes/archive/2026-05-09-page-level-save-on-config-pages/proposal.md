## Why

Three of the webapp's configuration pages (`/integrations`, `/network`, `/hardware`) currently mix two save patterns inconsistently: some sub-forms have a Save button (Mail, Rsync, CloudConfig, SocialMediaConfig, VPNConfig), others autosave on every field change (Cloud per-remote, Social general, every field on Hardware's Display/Buttons/Fan tabs, the WiFi country on Network). One of those autosaves — Cloud per-remote in `Connections.jsx:260-288` — has no last-saved guard and fires on every page load when `cloudRemoteFormData` transitions from `{}` to the loaded values, producing a "config.cfg was written successfully" toast on mount with no actual user change.

The autosave-on-change UX is also wrong for these pages on principle: each form is a **transactional unit** (an SMTP server config, a WiFi setup, a fan PWM curve) where partial application is meaningless or actively unsafe — half-saving an SMTP server with the host but no port can put the device in a state that can't send mail and is harder to debug than a clean "you have unsaved changes, hit Save" UX. By contrast, `/preferences` is a collection of **independent toggles** (theme, language, timezone) where each setting is self-contained and autosave-on-change is the right call.

This change unifies the three problem pages on a single sticky page-level Save button (one per page, visible on every tab), removes every per-field autosave on those pages, fixes the cloud-remote toast bug as a side effect, and codifies the rule in the pattern-system spec so future config pages get it right by default.

## What Changes

- **`/integrations` (Connections)**: remove inline Save buttons on Mail and Rsync sections; remove autosave on Cloud per-remote (the buggy one), Social general, and any other `useEffect` that calls `updateConfig` based on form-state change. Add a single sticky page-level Save button. Cloud per-remote and Social general gain explicit `handleSave` functions (mirroring the existing Mail/Rsync/CloudConfig/SocialMediaConfig pattern). The two existing nested components (`CloudConfig`, `SocialMediaConfig`) already use the `onSavedStateChange` callback to surface `(isSaved, handleSave)` — keep that contract; the page collects them via refs (already exists today) and calls them from the page-level Save button instead of the per-tab buttons.

- **`/network`**: remove the `handleWifiCountryChange` autosave (`Network.jsx:406-411`); lift `currentWifiCountry` into a form-state shape and add a `handleSave` that posts `conf_WIFI_COUNTRY`. Drop the inline `<Save>` button on `<VPNConfig>` (`VPNConfig.jsx:237-245`); its three config-form fields (`conf_VPN_TYPE_RSYNC`, `conf_VPN_TYPE_CLOUD`, `conf_VPN_TIMEOUT`) are folded into the page-level Save via the `onSavedStateChange` callback contract. The VPN **file upload and remove buttons stay event-driven and independent** of the page Save — they're not config-form actions and they save immediately on click via `POST /vpn/upload` and `POST /vpn/remove`. Add a single sticky page-level Save button.

- **`/hardware`**: convert `DisplayConfig`, `ButtonHardwareConfig`, `FanConfig` from autosave-per-field to the explicit save model. Each component swaps `updateConfig({ ...config, [key]: value })`-on-change for an internal `formData` + `handleSave` that calls `updateConfig` and exposes `(isSaved, handleSave)` via a new `onSavedStateChange` callback prop (matching the existing `CloudConfig` / `SocialMediaConfig` API). Add a single sticky page-level Save button.

- **`<PageSaveBar>` shared primitive**: extract the existing sticky Save bar from `Connections.jsx:646-668` (Mail) / `Connections.jsx:880-913` (Rsync) into a shared component at `webapp/src/components/PageSaveBar.jsx` with props `(isDirty, isSaving, onSave, drawerWidth, label?)`. All three converted pages render exactly one instance, outside the tab strip, so it shows on every tab.

- **`useFormSaveState` hook (optional)**: a small custom hook that takes `formData` + `lastSavedSnapshot` and returns `(isDirty, markSaved)`. Cuts the boilerplate currently inlined in CloudConfig / SocialMediaConfig / each Connections sub-form. Optional: if extraction lands cleanly without churning unrelated code, do it; otherwise leave for a follow-up.

- **`/preferences` is unchanged**: its debounced page-level autosave stays. Its content (theme, language, timezone, etc.) is an explicit collection of independent toggles — codified in the spec rule below.

- **Pattern-system spec delta**: ADD a requirement under `webapp-ui-pattern-system` distinguishing **multi-field configuration forms** (transactional units → page-level Save button required) from **independent toggle settings** (each field's effect is self-contained → autosave allowed). The rule names the four current page archetypes for traceability: Connections / Network / Hardware MUST use page-level Save; Preferences MAY autosave.

- **Bug fix as a side-effect**: removing the buggy `Connections.jsx:260-288` cloud-remote autosave eliminates the spurious toast. No separate bug-fix patch needed.

Non-goals:
- Reworking the Backup-page Options accordion (it's already form-driven by the run-now button, which IS a Save in disguise).
- Changing how the Express backend processes `/api/config/save`. The new payload is just a wider single call; the route already accepts an arbitrary key/value object.
- Visual redesign of the Save bar. We extract the existing styling verbatim.
- Confirmation dialogs / "discard unsaved changes" prompts on tab switch or navigation away. The Save bar stays visible regardless of tab; if the user navigates away with dirt, they lose changes silently — same as today. Adding a guard would belong in a separate change.

## Capabilities

### New Capabilities

<!-- None. -->

### Modified Capabilities

- `webapp-ui-pattern-system`: ADD a requirement codifying when configuration pages MUST use a page-level Save button vs MAY autosave. The rule pins the contract for the four current page archetypes (Connections / Network / Hardware / Preferences) and gives future config pages a clear default.

## Impact

- **Frontend**:
  - New: `webapp/src/components/PageSaveBar.jsx` (sticky-bottom bar with isDirty / onSave props).
  - Possibly new: `webapp/src/hooks/useFormSaveState.js` (optional hook).
  - Modified: `webapp/src/pages/Connections.jsx` — remove autosaves and inline Save buttons; orchestrate page-level save via the existing `cloudConfigRef` / `socialMediaConfigRef` pattern + new refs for Mail / Rsync / Cloud-per-remote / Social-general.
  - Modified: `webapp/src/pages/Network.jsx` — lift WiFi country into form state, drop the inline VPN Save, add the page-level Save bar.
  - Modified: `webapp/src/pages/Hardware.jsx` — same orchestration pattern across DisplayConfig / ButtonHardwareConfig / FanConfig.
  - Modified: `webapp/src/components/CloudConfig.jsx` — remove its inline Save button (the page handles it now); keep its `onSavedStateChange` contract.
  - Modified: `webapp/src/components/SocialMediaConfig.jsx` — same.
  - Modified: `webapp/src/components/VPNConfig.jsx` — remove its inline Save button; add `onSavedStateChange` callback.
  - Modified: `webapp/src/components/DisplayConfig.jsx` — replace per-field autosave with internal `formData` + Save callback. Add `onSavedStateChange` prop.
  - Modified: `webapp/src/components/ButtonHardwareConfig.jsx` — same conversion.
  - Modified: `webapp/src/components/FanConfig.jsx` — same conversion.
- **Backend**: no changes. `POST /api/config/save` already accepts an arbitrary key/value payload of `conf_*` settings.
- **i18n**: at most one new key (`config.save_settings_section_title` or similar; if `config.save_button` is enough, no new key). Verify; mirror across en/de/es/fi/fr if added.
- **Tests**:
  - New: `webapp/tests/e2e/page-level-save.spec.js` — for each of the three pages, edit a field on one tab, switch to another tab, edit a field there, hit the page-level Save once, assert one `POST /api/config/save` request fires with both fields in the payload, assert the toast appears, and assert the Save button becomes disabled until the next edit.
  - New: `webapp/tests/e2e/connections-no-spurious-save.spec.js` — load `/integrations` (no field edits), confirm zero `POST /api/config/save` requests fire and the saved-toast does not appear.
  - Existing tests under `tests/e2e/integrations-tabs.spec.js`, `network-tabs`-style suites, and `hardware-tabs.spec.js` continue to pass without changes (tab navigation is unaffected).
- **No new runtime deps**.
