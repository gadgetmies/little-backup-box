## 1. MockControls component

- [x] 1.1 Update the default settings shape in `webapp/src/components/MockControls.jsx`'s `loadSettings()` to include `displayStatus: { mode: 'ready', custom: '' }` with backward-compatible defaults for missing fields.
- [x] 1.2 Add a third `<FormControl>` inside the existing `<Stack>`: a Select with three options (`Ready` / `Info` / `Custom…`). When `Custom…` is selected, render a `<TextField>` underneath for the custom string. Wire change handlers to `setSettings`.

## 2. Mock API

- [x] 2.1 In `webapp/src/utils/mockApi.js`, locate the `/display/status` handler. Read the persisted MockControls settings from `localStorage` (`lbb-mock-controls`), resolve the configured status (`Ready` / `Working` / custom-trimmed), derive severity using the same rule as the backend, and return `{status, severity}`.

## 3. i18n

- [x] 3.1 Add four new keys to all five lang files (`en/de/es/fi/fr.json`):
  - `mock_controls.display_status` ("Display status")
  - `mock_controls.display_status_ready` ("Ready")
  - `mock_controls.display_status_info` ("Info")
  - `mock_controls.display_status_custom` ("Custom…")
- [x] 3.2 Run `npm run check:i18n` and confirm parity.

## 4. Verification

- [x] 4.1 `npm run lint` from `webapp/` — no new errors in touched files.
- [x] 4.2 `openspec validate --specs --changes` — green.
- [x] 4.3 Manual smoke (since this is a demo affordance for the static build): build the static demo (`npm run build:static`), preview it, expand MockControls, switch through Ready / Info / Custom, watch the AppBar icon change.
