## Context

`MockControls` already exists with two settings (delay, failureMode) persisted under `lbb-mock-controls` in `localStorage`. The mock API (`webapp/src/utils/mockApi.js`) reads them on every request to inject latency or fail-mode behaviour. The pattern is well-established; this change adds a third setting following the same shape.

The static-build wrapper (`MockControlsWrapper`) only renders the panel when `VITE_USE_MOCK_API=true`. That guard stays — production builds and dev:mock won't see the panel.

## Goals / Non-Goals

**Goals:**

- Visitors of the GitHub Pages demo can switch the AppBar status icon between `ready` and `info` and read arbitrary text in the popover.
- Persistence across reloads (matches the existing two settings).
- Spec the entire `mock-controls` capability while we're touching it, so future additions don't require rediscovering the convention.

**Non-Goals:**

- A dev:mock backend equivalent (would need a developer-only endpoint or a backend mock layer for `display.js`). Separate change if we want it.
- Surface mock controls in production builds.
- Trigger arbitrary backend mock behaviours (failure modes, delay) for the display endpoint specifically — those existing global settings still apply uniformly.

## Decisions

### Decision 1: Three preset options + Custom text field

- **Choice**: a Select with `Ready`, `Info` (a default non-ready string like `"Working"`), and `Custom…` options. `Custom…` reveals a text input.
- **Why**: covers the two demo-relevant icon states out of the box without typing, but keeps an escape hatch for testing long strings or specific scenarios (e.g., `"Backup complete"`, `"Err.: Files missing!"`).
- **Alternatives**:
  - Free text only. Rejected: visitors who just want to see the info icon without thinking would have to type — friction.
  - Long preset list (a dropdown of every `box.backup.*` translation). Rejected: too much UI for a demo affordance; visitors who want exotic strings can use Custom.

### Decision 2: Severity is derived in the mock layer, mirroring the backend

- **Choice**: when serving `/display/status`, the mock layer applies the same rule the backend does — `severity: 'ready'` when the trimmed status is empty or equals `"Ready"`, else `'info'`. Both literals match.
- **Why**: keeps the mock and the real backend in lockstep so behaviour observed in the demo predicts behaviour on a real device. If the backend rule changes (e.g., starts honouring a script-side severity tag), update both in the same PR.
- **Alternatives**:
  - Let the visitor pick severity directly. Rejected: divorces severity from status content, which is exactly the dependency the backend enforces; allowing demo visitors to pick mismatched combinations would create false expectations.
  - Hardcode severity per preset. Same outcome but more code; deriving is cleaner.

### Decision 3: Persist the new setting under the existing key

- **Choice**: extend the existing `lbb-mock-controls` JSON object with a new field — `displayStatus: { mode: 'ready' | 'info' | 'custom', custom: string }`. Default `{ mode: 'ready', custom: '' }`.
- **Why**: one localStorage key for the whole panel keeps the read/write atomic and matches the existing pattern. The two-field shape (`mode` + `custom`) means selecting `Ready` or `Info` and then switching to `Custom` doesn't lose the previously-typed custom text.

## Risks / Trade-offs

- **[Schema migration]** — existing `lbb-mock-controls` JSON in visitors' browsers won't have the new field. **Mitigation**: `loadSettings` already defaults each field if missing; add `displayStatus` with a sensible default (`{ mode: 'ready', custom: '' }`). Visitors with old localStorage automatically get the default; nothing breaks.
- **[Mock/backend drift]** — if someone edits the backend severity rule and forgets the mock, the demo lies about behaviour. **Mitigation**: spec scenarios call out the rule explicitly so reviewers spot the drift; both `device-display-status` and `mock-controls` specs reference the same rule.
- **[Demo overlay clutter]** — three controls in a small panel. **Mitigation**: the panel is already collapsible (existing `Collapse` block); third control fits in the same Stack.

## Migration Plan

Single commit. No backend touched. Old localStorage values get the new default field on next load. No reload required for the change to take effect (the mock reads localStorage on each request).

## Open Questions

- Should the panel also let you toggle a "request fails" mode for `/display/status` specifically, to demo the icon-disappears behaviour? Probably yes, but the existing global `failureMode` setting could be extended to include a `display_status` entry — a follow-up if anyone asks.
