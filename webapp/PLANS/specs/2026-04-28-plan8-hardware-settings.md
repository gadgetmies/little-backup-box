# Plan 8 — Hardware Settings

**Effort:** 1–2 days  
**Depends on:** Plan 1 (useAsyncAction)  
**Blocks:** nothing

---

## What this plan delivers

- Audit `DisplayConfig.jsx` against PHP `setup.php` display hardware fields; fill gaps
- Menu / button GPIO settings
- Fan / GPIO settings

---

## Step 1 — DisplayConfig audit

Before writing any code, read `webapp/src/components/DisplayConfig.jsx` in full and compare
every field against the PHP `setup.php` display hardware section (lines ~730–1000).

Produce a gap table:

| PHP field | Config key | Present in DisplayConfig? | Action |
|---|---|---|---|
| Enable display | `conf_display_enabled` | ? | Add if missing |
| Font size | `conf_display_font_size` | ? | Add if missing |
| … | … | … | … |

Implement only the missing fields — do not touch fields that are already present.

All display hardware settings live in a collapsed `Accordion` labelled "Display hardware"
in `UserInterface.jsx` (or wherever `DisplayConfig` is rendered). They are already inside
an accordion — this plan just fills the field gaps within it.

---

## Menu / button hardware settings

New component: `webapp/src/components/ButtonHardwareConfig.jsx`

Placed in `UserInterface.jsx` in a collapsed `Accordion` labelled "Button hardware".

| Field | Config key | UI |
|---|---|---|
| Enable buttons | `conf_menu_enabled` | `Checkbox` |
| Layout rotation | `conf_menu_rotation` | `Select` — 0 / 90 / 180 / 270 |
| Bounce time (ms) | `conf_menu_bouncetime` | `TextField` number |
| Edge detection | `conf_menu_edge` | `Select` — Rising / Falling / Both |
| Resistor pull | `conf_menu_pull` | `Select` — Pull-up / Pull-down |
| Button combinations | `conf_menu_combinations` | Table editor (see below) |

### Button combinations table editor

The combinations map button chord sequences to action names. Render as an editable table:
- Columns: "Buttons pressed" (text input) | "Action" (Select from action list) | Delete row button
- "Add combination" button appends a new row
- Action list fetched from `GET /api/config/button-actions` or hard-coded from PHP values

Serialised to config as a JSON string in `conf_menu_combinations`.

---

## Fan / GPIO settings

New fields added to the existing hardware section in `UserInterface.jsx` (or in
`ButtonHardwareConfig.jsx` under a "Fan" sub-heading):

| Field | Config key | UI | Validation |
|---|---|---|---|
| Fan temperature threshold | `conf_fan_temp_threshold` | `TextField` number | 0–100°C |
| Fan GPIO pin | `conf_fan_gpio_pin` | `TextField` number | Valid BCM pin numbers |

Add helper text: "Temperature (°C) at which the fan activates. 0 = always off."

---

## Mock additions

Config save (`POST /api/config/save`) already mocked. Extend with:
- Failure mode `gpio_conflict`: returns `{ error: "GPIO pin already in use" }` — fires
  when `conf_fan_gpio_pin` or a button combination pin conflicts with an existing assignment.

`GET /api/config/button-actions` → `{ actions: ['backup_start', 'backup_stop', 'view_next', 'view_prev', 'shutdown', 'reboot'] }`

---

## Verification

### 1. Static
- `npm run lint && npm run build` pass

### 2. Mock UI (`npm run dev:mock`)
- Run DisplayConfig audit first — list any gaps found and confirm they are now present
- Button hardware accordion visible in UserInterface, collapsed by default
- Enable buttons checkbox; rotation, bounce, edge, pull controls visible
- Combinations table: add a row, select action, delete a row
- Fan section: temperature and GPIO pin inputs with validation
- Enter GPIO pin that triggers `gpio_conflict` → inline error
- Fan threshold 0 → helper text "Fan disabled"
- Set delay 3000ms → spinner on save

### 3. E2E tests (`webapp/tests/e2e/hardware-settings.spec.js`)
- Button hardware accordion opens
- Combination table row can be added and deleted
- Fan GPIO conflict failure shows inline error

### 4. Real hardware
- Enable button hardware → physical buttons trigger configured actions
- Fan threshold set to 50°C → fan activates when CPU exceeds 50°C
- Display hardware gaps (from audit) work correctly on attached display
