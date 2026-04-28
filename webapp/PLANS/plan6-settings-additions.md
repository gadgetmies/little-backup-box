# Plan 6 — Settings Additions

Spec: `specs/2026-04-28-plan6-settings-additions.md`  
Depends on: Plan 1 (useAsyncAction)  
Estimated effort: 2–3 days

---

## Slices

### Slice 1 — Sepia theme

**Commit: "Add sepia theme option"**

Files to change:
- `webapp/src/theme.js` — add sepia palette: warm off-white background (`#f5f0e8`), dark brown text (`#3c2f1e`), warm accent colour; follow same structure as existing dark/light palettes
- `webapp/src/App.jsx` (or wherever `createTheme` is called) — handle `'sepia'` value alongside `'light'`/`'dark'`/`'system'`
- `webapp/src/pages/UserInterface.jsx` — add `<MenuItem value="sepia">Sepia</MenuItem>` to theme `Select`
- `webapp/src/components/Menu.jsx` — add `'sepia'` to `handleThemeChange` switch if applicable
- `webapp/public/lang/en.json` — add `config.view_theme_sepia` key
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same key, English fallback
- `webapp/tests/e2e/settings-additions.spec.js` — new test file:
  - Sepia theme selectable in settings
  - Selecting sepia changes `document.body` background colour to warm tone

Verification:
- `npm run dev:mock` → theme selector shows Sepia option
- Select Sepia → all pages: toolbar, drawer, cards, text show warm brown/cream palette
- No white/unstyled regions
- Sepia persists across page navigation
- `npx playwright test tests/e2e/settings-additions.spec.js`

---

### Slice 2 — Popup messages toggle

**Commit: "Add popup messages toggle; suppress Snackbar toasts when disabled"**

Files to change:
- `webapp/src/contexts/ConfigContext.jsx` — expose a `showToast(message, severity)` helper that no-ops when `config.conf_popup_messages === 'false'`; or wrap the Snackbar in a context that provides this
- `webapp/src/pages/UserInterface.jsx` — add `Checkbox` for `conf_popup_messages`
- Replace direct `Snackbar` usages across pages with `showToast()` — audit: `Backup.jsx`, `DatabaseOperations.jsx`, `FileOperations.jsx`, `UpdateManager.jsx`, `SettingsOperations.jsx`, `ServiceConnections.jsx`, `Network.jsx`
- Inline `Alert severity="error"` components are NOT affected — only transient success/info toasts
- `webapp/public/lang/en.json` — add popup messages label key
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same key, English fallback
- `webapp/tests/e2e/settings-additions.spec.js` — extend:
  - Popup messages checkbox unchecked → save action produces no Snackbar toast
  - Inline errors still appear regardless of setting

Verification:
- `npm run dev:mock` → toggle off popup messages → trigger a backup → no toast appears
- Inline errors still show regardless of toggle
- Toggle back on → toasts reappear

---

### Slice 3 — Simple settings fields (camera folder mask, target size, idle power-off, write-rating-to-EXIF)

**Commit: "Add camera folder mask, target size minimum, idle power-off, and write-rating-to-EXIF settings"**

Files to change:
- `webapp/src/pages/UserInterface.jsx` — add new "Backup" sub-section with:
  - Camera folder mask `TextField`: validate that value contains no `/`; show inline error if invalid; default placeholder `DCIM`
  - Target size minimum `TextField` type number: helper text "GB · 0 = disabled"
  - Idle power-off `TextField` type number: helper text "Minutes · 0 = disabled"
  - Image viewer sub-section: Write rating to EXIF `Checkbox`
  - All use the existing debounced-save pattern already in `UserInterface.jsx`
- `webapp/public/lang/en.json` — add keys for each field label and helper text
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/settings-additions.spec.js` — extend:
  - Camera folder mask validates `/` character (shows error, does not save)
  - Target size minimum and idle power-off accept numbers

Verification:
- `npm run dev:mock` → all four new fields visible in correct sections
- Camera folder mask: enter `DCIM/sub` → inline validation error, no save
- Target size 0 → shows "disabled" helper
- Idle power-off 0 → shows "disabled" helper

---

### Slice 4 — Timezone selector

**Commit: "Add timezone selector to settings"**

Files to change:
- `webapp/src/pages/UserInterface.jsx` — add timezone `Select` to existing language/UI section:
  - Options populated from `Intl.supportedValuesOf('timeZone')` (built-in, no dependency)
  - Make searchable by using MUI `Autocomplete` instead of plain `Select`
  - Current value loaded from `config.conf_timezone`
- `webapp/server/routes/config.js` (or wherever config save is handled) — when `conf_timezone` is in the saved keys, run the timezone-setting shell script after saving to `config.cfg`:
  - Find the script used in `setup.php` for timezone change; call it via `execCommand`
  - If the script doesn't exist, create `scripts/set_timezone.sh` that runs `timedatectl set-timezone "$1"`
- `webapp/src/utils/mockApi.js` — extend config save mock:
  - Failure mode `invalid_timezone`: fires when `conf_timezone` is in payload; returns `{ error: 'Unknown timezone identifier' }`
- `webapp/public/lang/en.json` — add timezone label key
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same key, English fallback
- `webapp/tests/e2e/settings-additions.spec.js` — extend:
  - Timezone autocomplete is searchable; typing "Helsinki" shows "Europe/Helsinki"
  - `invalid_timezone` failure shows inline error

Verification:
- `npm run dev:mock` → timezone autocomplete in settings
- Type "Helsinki" → narrows to "Europe/Helsinki"
- Enable `invalid_timezone` → inline error on save
- Real hardware: change timezone → `date` command reflects new zone

---

### Slice 5 — Background image and debug section

**Commit: "Add background image selector and debug section to settings"**

Files to change:
- `webapp/src/pages/UserInterface.jsx`
  - Background image `TextField` for path input in UI section; validate that value does not contain `..` (path traversal guard); helper text "Path to an image file on the device"
  - Collapsed `Accordion` at page bottom labelled "Developer / Debug" containing:
    - Log level `Select`: ERROR / WARNING / INFO / DEBUG
    - Log sync `Checkbox`
    - Display images keep `Checkbox`
- `webapp/public/lang/en.json` — add keys for background image, all debug fields
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/settings-additions.spec.js` — extend:
  - Background image input rejects `..` traversal attempts
  - Debug accordion collapsed by default; expands on click

Verification:
- `npm run dev:mock` → background image field in UI section
- Enter `../../etc/passwd` → inline validation error, no save
- Debug accordion collapsed by default
- Expand → all three debug fields present
- Enable `permission_denied` mock failure → inline error on save

---

### Slice 6 — Default backup mode matrix

**Commit: "Add default backup mode matrix to settings"**

Files to change:
- `webapp/src/pages/UserInterface.jsx` — add collapsed `Accordion` labelled "Default backup mode" in Backup sub-section containing:
  - Table: source rows (Camera, USB, Internal, NVMe) × target columns (USB, Internal, NVMe, Cloud, Rsync), only valid cells per spec matrix
  - Each valid cell: small `Select` with values `copy` | `move`
  - Config keys: `conf_default_backup_camera_usb`, `conf_default_backup_camera_internal`, etc.
  - Save via existing debounced config save
- `webapp/public/lang/en.json` — add matrix label keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/settings-additions.spec.js` — extend:
  - Backup mode matrix accordion expands
  - All valid cells present; invalid cells absent (e.g. Camera→Camera not shown)
  - Changing a cell value saves to config

Verification:
- `npm run dev:mock` → backup mode accordion in Backup section
- Expand → table with correct cells
- Camera→USB cell shows copy/move select
- Camera→Camera cell absent
