## Why

`<DisplayStatus>` currently renders a full-width `<Alert severity="info">` at the top of every page (mounted in `Layout.jsx:56`). It takes a chunk of vertical real estate even when the device is idle and the message is "Ready" — every page loses ~60 px of viewport to a banner most users glance at and ignore. The AppBar already hosts the language menu, theme menu, and power menu in the top-right cluster; a fourth icon there is the natural home for an at-a-glance device-state indicator.

## What Changes

- **Backend response shape** for `GET /api/display/status` extends from `{status: string}` to `{status: string, severity: 'ready' | 'info'}`. `severity` is `'ready'` when the trimmed `status` is empty or equals `"Ready"`; otherwise `'info'`. The shape is set up to grow to `'warning' | 'error'` later (when device-side scripts begin tagging messages); for now only the two values are emitted.
- **New `<StatusIndicator>`** component lives in the AppBar between the language menu and the theme menu. Renders an icon button whose icon reflects `severity`: a check-circle for `ready`, an info-circle for `info`. Click opens a dropdown panel with the current status text. No transition history (deferred — that needs a real polling-vs-event-stream rethink, see BACKLOG).
- **Removed**: `<DisplayStatus>` import + mount from `Layout.jsx`. The component file `webapp/src/components/DisplayStatus.jsx` is deleted.
- **i18n**: new key `status.tooltip` for the AppBar button's tooltip text ("Device status"); new key `status.ready` ("Ready") for when severity is `ready` and status is empty (placeholder text in the dropdown).
- **Tests**: `webapp/tests/e2e/display-status.spec.js` rewritten to assert the AppBar icon and dropdown rather than the body Alert. Existing route-stub pattern preserved.

Non-goals: device-side script tagging of warning/error severity (out of scope; backend currently derives severity from the status string only); transition history (deferred); animated icons during a backup (deferred until the LogMonitor refactor lands a real "is something running?" signal).

## Capabilities

### New Capabilities
<!-- None — this change extends behaviour and moves the rendering surface, but the user-facing capability "device status surfaced in the webapp" is already specified. -->

### Modified Capabilities
- `device-display-status`: response shape gains `severity`; render location moves from a per-page Alert to an AppBar icon-button + dropdown.

## Impact

- **Backend**: `webapp/server/routes/display.js` (compute and return `severity` alongside `status`).
- **Frontend**:
  - New: `webapp/src/components/StatusIndicator.jsx`.
  - Modified: `webapp/src/components/Menu.jsx` (mount `<StatusIndicator>` in the AppBar toolbar), `webapp/src/components/Layout.jsx` (drop `<DisplayStatus>`).
  - Deleted: `webapp/src/components/DisplayStatus.jsx`.
- **Mock**: `webapp/src/utils/mockApi.js` (extend `displayStatus` fixture to include `severity: 'ready'`).
- **i18n**: `webapp/public/lang/{en,de,es,fi,fr}.json` — add `status.tooltip`, `status.ready`.
- **Tests**: `webapp/tests/e2e/display-status.spec.js` (rewrite to assert the AppBar button + dropdown).
- **Docs**: `webapp/docs/feature-catalog.md` (UI location of "View device status" moves from per-page top to AppBar).
- **No script changes**, **no new deps**, **no route changes**.
