# Plan 6 — Settings Additions

**Effort:** 2–3 days  
**Depends on:** Plan 1 (useAsyncAction)  
**Blocks:** nothing

---

## What this plan delivers

New config fields in `UserInterface.jsx` and related pages, grouped by category.

---

## Fields to add

### Backup & viewer settings (new "Backup" sub-section in UserInterface.jsx)

| Field | Config key | UI control | Notes |
|---|---|---|---|
| Camera folder mask | `conf_camera_folder_mask` | `TextField` | Default `DCIM`; validate no `/` |
| Target size minimum | `conf_min_target_size` | `TextField` type number | GB; 0 = disabled |
| Idle power-off | `conf_idle_poweroff` | `TextField` type number | Minutes; 0 = disabled |
| Default backup mode matrix | `conf_default_backup_*` | Table of `Select` per source/target pair | See matrix below |

### Image viewer settings (new "Image viewer" sub-section)

| Field | Config key | UI control |
|---|---|---|
| Write rating to EXIF | `conf_write_exif_rating` | `Checkbox` |

### UI settings (add to existing language/theme section)

| Field | Config key | UI control | Notes |
|---|---|---|---|
| Timezone | `conf_timezone` | Searchable `Select` | IANA zones via `Intl.supportedValuesOf('timeZone')` |
| Theme | `conf_THEME` | `Select` | Add `sepia` option to existing light/dark/system |
| Background image | `conf_background_image` | `TextField` | Path input; validate no path traversal |
| Popup messages | `conf_popup_messages` | `Checkbox` | When unchecked, suppress `Snackbar` toasts globally |

### Debug section (collapsed `Accordion` at bottom of page, labelled "Developer / Debug")

| Field | Config key | UI control | Values |
|---|---|---|---|
| Log level | `conf_log_level` | `Select` | ERROR / WARNING / INFO / DEBUG |
| Log sync | `conf_log_sync` | `Checkbox` | Flush after every line |
| Display images keep | `conf_display_images_keep` | `Checkbox` | Keep generated display images on disk |

---

## Default backup mode matrix

Valid source/target combinations (from `index.php`):

| Source \ Target | USB | Internal | NVMe | Cloud | Rsync |
|---|---|---|---|---|---|
| Camera | ✓ | ✓ | ✓ | ✓ | ✓ |
| USB | — | ✓ | ✓ | ✓ | ✓ |
| Internal | ✓ | — | ✓ | ✓ | ✓ |
| NVMe | ✓ | ✓ | — | ✓ | ✓ |

Config keys follow the pattern `conf_default_backup_<source>_<target>` (e.g.
`conf_default_backup_camera_usb`). Values: `copy` | `move`.

Render as a responsive table: source rows, target columns, each cell a small `Select`.
Wrap in a collapsed `Accordion` labelled "Default backup mode" so it doesn't dominate the page.

---

## Popup messages toggle implementation

When `conf_popup_messages === 'false'`, the global `Snackbar` toasts should be suppressed.
Implement by reading this config value in a `NotificationContext` (or extend `ConfigContext`)
and returning a no-op from the show-toast function when the setting is off.

Errors (inline `Alert`) are not affected — only transient success toasts.

---

## Timezone save

Saving timezone requires a privileged system call. The Node backend must invoke the existing
shell script used by the PHP implementation rather than calling `timedatectl` directly:

```js
// webapp/server/routes/config.js — extend existing save handler
if (changedKeys.includes('conf_timezone')) {
  await execCommand(`scripts/set_timezone.sh ${newTimezone}`);
}
```

Verify the script name against `setup.php`'s timezone-save code.

---

## Sepia theme

Add `sepia` to the theme `Select` in `UserInterface.jsx`. Extend `theme.js` with a sepia
palette (warm off-white background, dark brown text). The theme switcher in `App.jsx` or
`theme.js` must handle the `sepia` value.

---

## Mock additions

`POST /api/config/save` already exists. Extend mock to:
- Apply configured delay
- Failure mode `permission_denied` → returns `{ error: "Config file not writable" }`
- Failure mode `invalid_timezone` → returns `{ error: "Unknown timezone" }` (only fires when timezone field is in the payload)

---

## Verification

### 1. Static
- `npm run lint && npm run build` pass
- Sepia theme renders without white/unstyled regions (check all page backgrounds)

### 2. Mock UI (`npm run dev:mock`)
- Camera folder mask field shows `DCIM` placeholder; entering `/DCIM` shows validation error
- Target size minimum accepts numbers only; 0 shows "disabled" helper text
- Idle power-off field shows "0 = disabled" helper
- Backup mode matrix renders all valid source/target cells; invalid cells are absent
- Write rating to EXIF checkbox visible in Image viewer section
- Timezone selector is searchable; typing "Helsinki" narrows to "Europe/Helsinki"
- Theme selector shows light/dark/system/sepia; selecting sepia applies warm palette
- Sepia theme: check toolbar, drawer, cards, text — all should have sepia tones
- Popup messages unchecked → perform a save action → no Snackbar toast (inline Alert still works)
- Debug accordion collapsed by default; expand shows log level/sync/display-images-keep
- Set delay 3000ms → save spinner appears on all fields
- Enable `permission_denied` → inline error "Config file not writable" below Save
- Enable `invalid_timezone` → inline error on timezone field only

### 3. E2E tests (`webapp/tests/e2e/settings-additions.spec.js`)
- Camera folder mask field present and validates `/` character
- Backup mode matrix renders correct cells
- Sepia theme is selectable and changes body background colour
- Popup messages toggle suppresses Snackbar
- permission_denied failure shows inline error

### 4. Real hardware
- Change timezone to `Europe/Helsinki` → system time updates (`date` command confirms)
- Set camera folder mask to custom value → backup from camera respects it
- Idle power-off set to 5 → device shuts down after 5 minutes of inactivity
