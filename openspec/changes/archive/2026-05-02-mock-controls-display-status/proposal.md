## Why

The AppBar status icon (landed in `move-status-to-appbar`) has two visual states — `ready` (check icon) and `info` (info icon) — but the static GitHub Pages demo only ever serves `{status: 'Ready', severity: 'ready'}` from `webapp/src/utils/mockApi.js`. There's no way to see the `info` icon in the demo, no way to test what a long status string looks like in the popover, and no way to demo a failure mode without editing source.

The webapp already ships a `MockControls` panel (`webapp/src/components/MockControls.jsx`) that renders only when `VITE_USE_MOCK_API=true` and lets the developer/visitor tweak two demo settings — request `delay` and `failureMode`. Extending it with a third setting — current display status — is the minimum-friction way to make the AppBar icon explorable in the demo.

## What Changes

- **Extend `MockControls`** with a third control: a status-state Select with three options (`Ready`, `Info`, `Custom…`) and, when `Custom…` is selected, a text input. The chosen text is persisted alongside the existing `delay` and `failureMode` settings under `lbb-mock-controls` in `localStorage`.
- **Mock API**: `webapp/src/utils/mockApi.js` reads the new setting on every `/display/status` request and returns `{status, severity}` accordingly. Severity follows the same rule the backend uses (`'ready'` for empty or `"Ready"`, else `'info'`).
- **i18n**: new keys `mock_controls.display_status` (label), `mock_controls.display_status_ready`, `mock_controls.display_status_info`, `mock_controls.display_status_custom` across all five language files.
- **Document `mock-controls`** as a first-class capability in `openspec/specs/`. Currently it's an undocumented developer/demo affordance; this change adds a spec for it including the existing delay/failureMode controls plus the new status control.

Non-goals: extending the dev:mock backend (`USE_MOCKS=true`) to honour the same setting — that's a separate change requiring either a backend mock layer for `display.js` or a developer endpoint that writes to `<tmp>/display-content/`. The current scope is the static-build (`VITE_USE_MOCK_API=true`) demo only.

## Capabilities

### New Capabilities
- `mock-controls`: a developer/demo overlay rendered only in the static-build (`VITE_USE_MOCK_API=true`) that lets the visitor adjust mock-API behaviour (request delay, failure mode injection, current display status) at runtime, persisted to `localStorage`.

### Modified Capabilities
<!-- None — the existing device-display-status spec is unchanged; this is purely a demo affordance that drives the same response shape. -->

## Impact

- **Frontend**:
  - Modified: `webapp/src/components/MockControls.jsx` (third FormControl + state field).
  - Modified: `webapp/src/utils/mockApi.js` (read the persisted setting when serving `/display/status`).
- **i18n**: 4 new keys × 5 language files.
- **Tests**: none required for the new spec — the AppBar icon's behaviour is already covered by `webapp/tests/e2e/display-status.spec.js` which uses `page.route` stubs (independent of MockControls). Manually exercise via the static build.
- **Docs**: none beyond the new spec; the developer-tool nature means this isn't a user-facing feature for the catalog.
- **No backend changes**, **no script changes**, **no new deps**.
