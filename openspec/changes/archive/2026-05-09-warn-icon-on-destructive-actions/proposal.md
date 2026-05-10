## Why

Destructive actions in the webapp are currently flagged inconsistently. `FileOperations.jsx` shows a `<WarningIcon>` (in an Alert) next to the rename warning, and `Network.jsx` puts a `<WarningAmberIcon>` on the "Reset WiFi to AP mode" accordion summary, but the actual destructive *buttons* — Format and fsck Repair (`Storage.jsx`), Reset WiFi (`Network.jsx`), Delete rejected images (`View.jsx`), and Stop LBB / Reboot / Power off in the AppBar power menu (`Menu.jsx`) — rely on plain text or a red `color="error"` button alone. A user who misses the colour cue (or is colourblind, or skims) gets no second signal that the click they're about to make is irreversible. We can fix this in one pass by adopting a single rule across the app and adding it to the UI pattern system.

## What Changes

- Add a new requirement to the `webapp-ui-pattern-system` spec that mandates a leading `<WarningAmberIcon>` (or equivalent MUI warning icon) immediately to the left of the action label on every destructive button, and on the `MenuItem` label of any destructive entry in the AppBar power menu.
- Audit and update the call sites where the rule is currently violated:
  - `Storage.jsx`: Format button and fsck Repair button get a leading warning icon.
  - `Network.jsx`: the "Reset WiFi to AP mode" Button (inside the comitup-reset accordion) gets a leading warning icon next to its label, in addition to the existing accordion-summary icon.
  - `View.jsx`: the "Delete rejected" button gets a leading warning icon.
  - `Menu.jsx`: each of the three power-menu items (Stop LBB, Reboot, Power off) gets a leading warning icon next to the label.
- Leave the existing `<Alert severity="warning" icon={<WarningIcon />}>` blocks (e.g. in `FileOperations.jsx`) untouched — they are warning *banners*, not the per-button icon the new rule covers.
- Add the translation-friendly icon adjacent to the label (not as the only content of the button) so screen readers still announce the button label. The icon is decorative.
- Remove the corresponding bullet from the top of `openspec/BACKLOG.md` "Soon".

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `webapp-ui-pattern-system`: adds a "destructive actions are flagged with a warning icon" requirement so every page composes the same affordance for irreversible operations.

## Impact

- Affected files:
  - `openspec/specs/webapp-ui-pattern-system/spec.md` (add requirement)
  - `webapp/docs/ui-pattern-system.md` (mirror the rule in the contributor doc)
  - `webapp/src/pages/Storage.jsx`
  - `webapp/src/pages/Network.jsx`
  - `webapp/src/pages/View.jsx`
  - `webapp/src/components/Menu.jsx`
  - `openspec/BACKLOG.md` (remove the bullet)
- No backend / API / config changes. No new translation keys (icons are visual; existing labels are reused).
- No data migrations.
- Visual change only — no behavioural change to what each button does.
