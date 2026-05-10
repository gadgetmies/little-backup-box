# Plan 8 — Hardware Settings

Spec: `specs/2026-04-28-plan8-hardware-settings.md`  
Depends on: Plan 1 (useAsyncAction)  
Estimated effort: 1–2 days

---

## Slices

### Slice 1 — DisplayConfig audit and gap-fill

**Commit: "Fill missing display hardware fields in DisplayConfig"**

Before writing any code, do the audit:

1. Read `webapp/src/components/DisplayConfig.jsx` in full
2. Read `scripts/setup.php` lines ~730–1000 (display hardware section)
3. Build the gap table: list every PHP field and whether it is present in `DisplayConfig.jsx`
4. Implement only the missing fields — do not touch existing ones

Expected gaps (verify against actual code — do not assume):

| PHP field | Config key | Expected gap? |
|---|---|---|
| Enable display | `conf_display_enabled` | Verify |
| Font size | `conf_display_font_size` | Verify |
| Frame time | `conf_display_frame_time` | Verify |
| I²C address | `conf_display_i2c_address` | Verify |
| SPI device | `conf_display_spi_device` | Verify |
| Resolution W×H | `conf_display_width`, `conf_display_height` | Verify |
| X/Y offsets | `conf_display_offset_x`, `conf_display_offset_y` | Verify |
| Driver name | `conf_display_driver` | Verify |
| BGR toggle | `conf_display_bgr` | Verify |
| Inverse toggle | `conf_display_inverse` | Verify |
| Backlight enable | `conf_display_backlight` | Verify |
| Backlight GPIO pin | `conf_display_backlight_pin` | Verify |
| Color model | `conf_display_color_model` | Verify |
| Statusbar enable | `conf_display_statusbar` | Verify |
| IP repeat interval | `conf_display_ip_repeat` | Verify |
| Colors (fg/bg/hl) | `conf_display_color_*` | Verify |

Files to change:
- `webapp/src/components/DisplayConfig.jsx` — add only the fields identified as missing in the audit
- `webapp/public/lang/en.json` — add translation keys for new fields only
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/hardware-settings.spec.js` — new test file:
  - All fields from the audit gap list are now present in the component

Verification:
- `npm run dev:mock` → DisplayConfig expanded shows all fields from PHP
- No field from the PHP list is missing
- Existing fields unchanged
- `npx playwright test tests/e2e/hardware-settings.spec.js`

---

### Slice 2 — Button hardware settings component

**Commit: "Add button hardware configuration section to settings"**

Files to create/change:
- `webapp/src/components/ButtonHardwareConfig.jsx` — new component:
  - Enable buttons `Checkbox` (`conf_menu_enabled`)
  - Layout rotation `Select`: 0 / 90 / 180 / 270 (`conf_menu_rotation`)
  - Bounce time `TextField` number, ms (`conf_menu_bouncetime`)
  - Edge detection `Select`: Rising / Falling / Both (`conf_menu_edge`)
  - Resistor pull `Select`: Pull-up / Pull-down (`conf_menu_pull`)
  - Combinations table editor:
    - Columns: "Buttons" (text input) | "Action" (Select) | Delete row `IconButton`
    - "Add combination" `Button` appends new blank row
    - Action list fetched from `GET /api/config/button-actions`; falls back to hard-coded list if endpoint missing
    - Serialised to `conf_menu_combinations` as JSON string
  - All fields use existing debounced config-save pattern
- `webapp/server/routes/config.js` — add `GET /api/config/button-actions` → returns `{ actions: ['backup_start','backup_stop','view_next','view_prev','shutdown','reboot'] }` (derive list from `cmd.php` / scripts)
- `webapp/src/pages/UserInterface.jsx` — add collapsed `Accordion` labelled "Button hardware" containing `<ButtonHardwareConfig />`
- `webapp/src/utils/mockApi.js` — `GET /api/config/button-actions` → fixture action list; config save: failure mode `gpio_conflict` → `{ error: 'GPIO pin already in use' }`
- `webapp/public/lang/en.json` — add button hardware keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/hardware-settings.spec.js` — extend:
  - Button hardware accordion opens
  - Combinations table: add row, select action, delete row
  - `gpio_conflict` failure shows inline error

Verification:
- `npm run dev:mock` → Button hardware accordion in settings, collapsed by default
- Expand → all five config fields + combinations table
- Add combination row, select action, save
- Delete row, save
- Enable `gpio_conflict` → inline error on save

---

### Slice 3 — Fan / GPIO settings

**Commit: "Add fan and GPIO temperature settings"**

Files to change:
- `webapp/src/pages/UserInterface.jsx` — add Fan sub-section inside the Button hardware accordion (or as a separate collapsed accordion labelled "Fan"):
  - Temperature threshold `TextField` number; validation 0–100; helper text "°C — 0 = fan always off"
  - GPIO pin `TextField` number; helper text "BCM pin number"
  - Config keys: `conf_fan_temp_threshold`, `conf_fan_gpio_pin`
- `webapp/src/utils/mockApi.js` — extend `gpio_conflict` failure to also fire when `conf_fan_gpio_pin` is in the save payload
- `webapp/public/lang/en.json` — add fan label keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/hardware-settings.spec.js` — extend:
  - Fan fields present
  - Temperature outside 0–100 shows validation error
  - `gpio_conflict` on fan pin shows inline error

Verification:
- `npm run dev:mock` → fan fields visible
- Enter temperature 101 → validation error "Must be 0–100"
- Enter 0 → helper shows "Fan always off"
- Enable `gpio_conflict` on save → inline error
