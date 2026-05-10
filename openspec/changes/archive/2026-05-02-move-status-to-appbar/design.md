## Context

The previous change `fix-display-status-eisdir` got the backend reading the right place (the latest frame in `<tmp>/display-content/`) and got the spec for `device-display-status` written. This change keeps that behaviour and changes only the *severity discrimination* (backend) and the *rendering surface* (frontend).

The "render in AppBar" idea has been on the BACKLOG since 2026-05-02. The user has confirmed two scoping decisions for this first cut: (1) only differentiate `Ready` vs everything else for now, with the response shape ready to expand; (2) skip transition history because the polling-only mechanism doesn't model events well — that's a later LogMonitor-shaped problem.

## Goals / Non-Goals

**Goals:**

- Reclaim ~60 px of viewport on every page by removing the per-page Alert.
- Surface device state at a glance via icon + colour in the AppBar.
- Backend response shape is forward-compatible with future `warning` / `error` severities without further breaking changes.

**Non-Goals:**

- Animated/spinner state during a long-running backup. The current `<DisplayStatus>` doesn't have one either; a real "in progress" signal needs the LogMonitor refactor.
- Transition history in the dropdown. Deferred per the user; the dropdown shows just the current message.
- Device-side script changes. Backend severity is derived from the status string; scripts are not asked to emit a tag.
- Renaming `device-display-status` to something AppBar-flavoured. The capability hasn't changed; only its rendering location has.

## Decisions

### Decision 1: Backend computes severity from the status string; future-proof shape

- **Choice**: response is `{status: string, severity: 'ready' | 'info'}`. Severity rule: trim status; if empty or equals `"Ready"`, severity is `'ready'`; otherwise `'info'`. Extend the union with `'warning' | 'error'` later when scripts opt in.
- **Why**: keeps the change local — no script touches required, and the wire shape is already what we'd want once severity tagging lands script-side. The `'Ready'` literal match works against both the mock and the real `scripts/lang/en.json` `box.backup.connect_camera_1` value (which is `"Ready"`).
- **Alternatives**:
  - Send only `status`, derive severity in the React component. Rejected: pushes presentation logic into the consumer; multiple consumers (AppBar icon + future log monitor) would re-implement the same rule.
  - Pure pass-through with a separate `/api/display/severity` endpoint. Rejected: doubles the polling cost.
  - Match a regex of error tokens (`Error|Err\.|failed|missing`) and emit `'error'` today. Rejected per user — explicitly scoped to `Ready` vs `info` for now.

### Decision 2: New `<StatusIndicator>` component, not a hook

- **Choice**: a small standalone component in `webapp/src/components/StatusIndicator.jsx` that owns its polling, state, and rendering. Mount it in `Menu.jsx` between the language menu and the theme menu.
- **Why**: mirrors how the language and theme menus are structured — each is its own button + Menu pair inside `Menu.jsx`'s top-right cluster. Keeping `Menu.jsx` from growing with another `useState` + `useEffect` block keeps the file readable.
- **Alternatives**:
  - Inline the markup in `Menu.jsx`. Rejected: `Menu.jsx` is already 800+ lines; pushing another stateful block into it makes it harder to navigate.
  - Provide a `useDeviceStatus` hook and consume from `Menu.jsx`. Rejected: the only consumer for now is the AppBar; ceremony without payoff.

### Decision 3: Use MUI's `Popover` (not `Menu`) for the dropdown

- **Choice**: clicking the icon opens an MUI `<Popover>` anchored to the icon button, containing the status text rendered as a small `<Stack>` with the severity icon and the trimmed message. Use `<Menu>` only for actual menus of selectable items.
- **Why**: the dropdown shows information, not options. `<Menu>` would render each line as a `MenuItem` with hover/selection styling that doesn't fit. `<Popover>` is the lower-level primitive `<Menu>` is built on; it stays out of the way.
- **Alternatives**:
  - `<Tooltip>`. Rejected: tooltips are hover-only and disappear on click; the user asked for a dropdown that opens on click and stays open.
  - Custom positioning with `<Box>` + `position: 'absolute'`. Rejected: reinvents what `<Popover>` already gives.

### Decision 4: Hide the AppBar icon entirely when status is empty

- **Choice**: when `severity === 'ready'` AND `status` is empty (no current frame), the icon button still renders (with the ready icon and a default tooltip "Device status"). When the request fails entirely, hide the button.
- **Why**: hiding the button on empty content would create a layout shift every time the device transitions to/from idle. The ready icon is small and unobtrusive; better to always show it. Hide only on outright API failure where there's nothing meaningful to indicate.
- **Alternatives**:
  - Hide on empty. Rejected per above (layout shift).
  - Always show, even on API failure. Could indicate "?" icon. Rejected: indicating a fault that the user can't act on adds noise.

## Risks / Trade-offs

- **[Mobile AppBar crowding]** — the AppBar already has language / theme / power icons; on narrow viewports the title + four icons may wrap. **Mitigation**: the icons are the small (`size="small"`) variant already; `StatusIndicator` follows the same pattern. If wrapping becomes a problem the language and theme menus can collapse into a single overflow menu — separate change, BACKLOG it if it bites.
- **[Severity false negatives]** — anything that isn't literally `"Ready"` becomes `'info'`, including future device-side strings that *should* be ready (e.g., a translated `"Bereit"` from `scripts/lang/de.json`). **Mitigation**: explicit non-goal here — a follow-up that tags severity at the script side handles all locales correctly. For now, the device runs in English by default and the status comes from the device, not the user's browser language.
- **[Test rewrite churn]** — the existing `display-status.spec.js` (just landed) is rewritten. **Mitigation**: it's a five-line spec; the route stub pattern is reused.

## Migration Plan

Single commit. No migration steps — the response shape extension is additive (existing consumers ignore unknown fields), the component swap is atomic, and the i18n keys are new.

## Open Questions

- Should the dropdown also show the most recent error (separate field, sticky until acknowledged) once severity expands? Probably yes, but design that with the AppBar redesign that surfaces multi-state alerts (separate change).
- Tooltip wording for non-English locales — the German "Gerätestatus", Spanish "Estado del dispositivo", etc. — left as the English string in non-en lang files per the existing project convention. A native-speaker pass is a separate cleanup.
