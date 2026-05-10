# Mock controls

## Purpose

Developer/demo overlay rendered only in the static-build mock-API mode (`VITE_USE_MOCK_API=true`) that lets visitors adjust mock-API behaviour (request delay, failure-mode injection, current display status) at runtime, persisted to `localStorage`.

## Requirements

### Requirement: MockControls renders only in static-build (mock-API) mode

The `MockControls` component SHALL render its panel only when `import.meta.env.VITE_USE_MOCK_API === 'true'`. In all other build modes (production, dev:mock, dev), the wrapper SHALL return `null` and produce no DOM.

#### Scenario: Static build with mock API

- **WHEN** the webapp is loaded with `VITE_USE_MOCK_API=true`
- **THEN** the MockControls panel renders fixed at the bottom-right of the viewport

#### Scenario: Production or dev:mock build

- **WHEN** the webapp is loaded without `VITE_USE_MOCK_API=true`
- **THEN** no MockControls panel is in the DOM

### Requirement: MockControls exposes three runtime settings

The MockControls panel SHALL expose three editable settings, each persisted to `localStorage` under the key `lbb-mock-controls` as a single JSON object:

- `delay` (number, ms): an artificial latency added to every mock-API response.
- `failureMode` (string): a key from `MOCK_FAILURE_MODES` (or empty) that selects an injected failure response for matching requests.
- `displayStatus` (object: `{ mode, custom }`): controls what the mock layer returns for `GET /api/display/status`. `mode` is one of `'ready' | 'info' | 'custom'`. `custom` is the literal string used when `mode` is `'custom'` (otherwise ignored).

Settings load on mount from `localStorage` with sensible defaults for missing fields, and write back on every change.

#### Scenario: Default settings on first visit

- **WHEN** a visitor opens the demo with no prior `lbb-mock-controls` entry
- **THEN** settings default to `{ delay: 0, failureMode: '', displayStatus: { mode: 'ready', custom: '' } }`

#### Scenario: Forward-compatible read

- **WHEN** the existing `lbb-mock-controls` JSON in localStorage lacks the `displayStatus` field
- **THEN** the panel still loads, treating `displayStatus` as the default `{ mode: 'ready', custom: '' }`
- **AND** writes back the full object including `displayStatus` on the next change

#### Scenario: Switching modes preserves custom text

- **WHEN** the visitor types a custom string, switches to `Ready`, then switches back to `Custom…`
- **THEN** the previously-typed custom string is restored in the input

### Requirement: Mock API derives display-status response from MockControls

When `VITE_USE_MOCK_API=true`, the mock adapter (`webapp/src/utils/mockApi.js`) SHALL serve `GET /api/display/status` by reading the `displayStatus` setting from `localStorage` and returning `{status, severity}`:

- If `mode` is `'ready'`: `status: 'Ready'`.
- If `mode` is `'info'`: `status: 'Working'` (or another non-empty default).
- If `mode` is `'custom'`: `status: <custom string, trimmed>`.

`severity` SHALL be derived from the resolved `status` string using the same rule as the backend: `'ready'` if the trimmed string is empty or equals `"Ready"`; otherwise `'info'`.

#### Scenario: Mock API serves the configured status

- **WHEN** the visitor sets `displayStatus.mode` to `'info'` in MockControls
- **THEN** subsequent polls of `/api/display/status` from the AppBar StatusIndicator return `{status: 'Working', severity: 'info'}`

#### Scenario: Custom status with empty trimmed value

- **WHEN** the visitor sets `mode: 'custom'` and types only whitespace into the custom field
- **THEN** the mock returns `{status: '', severity: 'ready'}` (matching the backend behaviour for empty status)

#### Scenario: Severity derivation matches the backend

- **WHEN** the resolved status is empty or equals `"Ready"`
- **THEN** the mock returns `severity: 'ready'`
- **WHEN** the resolved status is any other non-empty string
- **THEN** the mock returns `severity: 'info'`

### Requirement: MockControls renders below MUI's modal/popover layer

The MockControls panel SHALL use a `z-index` strictly less than `1300` (MUI's modal-layer baseline). Popovers, Dialogs (1300), and Snackbars (1400) anchored anywhere in the viewport SHALL render above the panel; ordinary page content SHALL render below it. AppBar level (`1100`) is the recommended value.

The panel is a developer overlay; it must not occlude interactive UI such as the AppBar StatusIndicator popover, confirmation dialogs, or transient toasts even when the panel is expanded and visually overlaps them.

#### Scenario: AppBar popover renders above the panel

- **WHEN** the AppBar StatusIndicator popover (or any other MUI Popover anchored in the viewport) opens AND the MockControls panel is expanded
- **THEN** the popover renders fully visible above the MockControls panel

#### Scenario: Dialog and snackbar render above the panel

- **WHEN** an MUI Dialog or Snackbar appears in the bottom-right region while the MockControls panel is expanded
- **THEN** the Dialog or Snackbar renders fully visible above the MockControls panel
