# Device display status

## Purpose

Contract for `GET /api/display/status` and the AppBar `<StatusIndicator>` component: how the latest display frame written by the device-side scripts is surfaced in the webapp.

## Requirements

### Requirement: `GET /api/display/status` returns the latest queued display message

The webapp backend SHALL expose `GET /api/display/status` that returns `{status: <string>, severity: 'ready' | 'info'}`, where:

- `status` is the trimmed contents of the most recent display frame the device-side scripts have written.
- `severity` is `'ready'` when the trimmed `status` is empty or equals `"Ready"`; otherwise `'info'`.

The shape is forward-compatible with future `'warning' | 'error'` severities, which a follow-up may add when device-side scripts begin tagging messages.

The handler SHALL treat the path identified by `getDisplayContentPath(workingDir, constants)` as a directory, list its `.txt` entries, sort them lexicographically, and read the last one. The filename convention is `<14-digit-uptime-centiseconds>.txt`, so lexicographic order matches chronological order.

#### Scenario: Directory contains queued frames

- **WHEN** the directory contains one or more `.txt` files
- **THEN** the handler reads the lexicographically last filename and returns its trimmed contents in `status` plus the derived `severity`

#### Scenario: Directory is empty but old-file fallback exists

- **WHEN** the directory exists with zero `.txt` entries AND a sibling `display-content-old.txt` exists with non-empty contents
- **THEN** the handler returns the trimmed contents of `display-content-old.txt` in `status` plus the derived `severity`

#### Scenario: Directory is missing or unreadable

- **WHEN** the directory does not exist, cannot be listed, or contains no readable content (and no fallback file)
- **THEN** the handler returns `{status: '', severity: 'ready'}` and does not throw

#### Scenario: Severity derivation is purely from the status string

- **WHEN** the resolved `status` is empty or matches the literal `"Ready"` (after trim)
- **THEN** `severity` is `'ready'`
- **WHEN** the resolved `status` is any other non-empty string
- **THEN** `severity` is `'info'`

### Requirement: Device status is rendered as an AppBar icon-button with a dropdown

The webapp SHALL render the device status as a small icon-button in the AppBar (inside `Menu.jsx`'s top-right cluster, between the language menu and the theme menu) implemented by a `StatusIndicator` component at `webapp/src/components/StatusIndicator.jsx`.

The icon SHALL reflect `severity`: a check-circle (or similar "OK" iconography) for `'ready'`, an info-circle for `'info'`. Clicking the button SHALL open an MUI `<Popover>` containing the current `status` text. When `status` is empty (severity `'ready'`), the dropdown SHALL display a localised "Ready" placeholder under the key `status.ready`.

The webapp SHALL NOT mount a per-page `<DisplayStatus>` Alert in `Layout.jsx`; the AppBar instance is the single rendering surface for device status.

#### Scenario: Severity is `'ready'`

- **WHEN** the polled response has `severity: 'ready'`
- **THEN** the AppBar button renders the ready icon
- **AND** clicking the button opens a popover containing either the trimmed `status` (when non-empty) or the localised `status.ready` placeholder (when empty)

#### Scenario: Severity is `'info'`

- **WHEN** the polled response has `severity: 'info'`
- **THEN** the AppBar button renders the info icon
- **AND** clicking the button opens a popover containing the trimmed `status`

#### Scenario: API request fails entirely

- **WHEN** the polling request to `/api/display/status` fails (network or non-2xx)
- **THEN** the AppBar button is hidden until the next successful poll
- **AND** no error UI is shown (the user has nothing to act on)

#### Scenario: Per-page Alert is gone

- **WHEN** any page renders
- **THEN** there is no `<Alert severity="info">` containing device status text above the page content
- **AND** `Layout.jsx` does not import or mount any per-page status component

### Requirement: Tooltip and placeholder are translated

The AppBar button SHALL expose a tooltip (key `status.tooltip`, default English `"Device status"`) and the empty-status popover SHALL show the placeholder under key `status.ready` (default English `"Ready"`). Both keys SHALL exist in all five language files (`webapp/public/lang/{en,de,es,fi,fr}.json`).

#### Scenario: Tooltip is translated

- **WHEN** a user hovers the AppBar status button
- **THEN** the tooltip text is `t('status.tooltip')`

#### Scenario: Empty-status placeholder is translated

- **WHEN** the popover renders with no current status text
- **THEN** the placeholder text is `t('status.ready')`

### Requirement: Path helpers are centralised

`webapp/server/utils/paths.js` SHALL expose both `getDisplayContentPath(workingDir, constants)` (the directory) and `getDisplayContentOldFilePath(workingDir, constants)` (the sibling fallback file). The route handler SHALL NOT hardcode either filename.

#### Scenario: Route uses path helpers

- **WHEN** the display-status route handler resolves filesystem paths
- **THEN** it calls the helpers from `paths.js` and never literals `'display-content'` or `'display-content-old.txt'` inline
