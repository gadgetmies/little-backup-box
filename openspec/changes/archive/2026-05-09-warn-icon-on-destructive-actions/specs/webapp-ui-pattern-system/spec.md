## ADDED Requirements

### Requirement: Destructive action controls carry a leading warning icon

Every webapp control that performs a *destructive action* — an operation that cannot be undone with a follow-up click in the UI, such as formatting storage, repairing a filesystem (`fsck` repair), resetting WiFi to AP mode, deleting rejected images, stopping the LBB service, rebooting the device, or powering off the device — SHALL render a `<WarningAmberIcon />` (the MUI outlined warning icon) as a leading element immediately to the left of the control's text label.

For MUI `<Button>` controls the icon SHALL be passed via the `startIcon` prop. For MUI `<MenuItem>` controls (where no `startIcon` prop exists), the icon SHALL be the first child inside a flex container that also holds the existing label. The icon SHALL be decorative (no `titleAccess`); the existing text label remains the accessible name.

This rule covers per-control affordances only. Section-level cues — for example a `<WarningAmberIcon>` on an `AccordionSummary` introducing a destructive section, or a `<WarningIcon>` inside a `<Alert severity="warning">` banner — are out of scope and continue to use whichever variant is already in place.

The current call sites that this rule applies to are: Storage Format button, Storage fsck Repair button, Network "Reset WiFi to AP mode" button (inside the comitup-reset accordion), View "Delete rejected" button, and the Stop LBB / Reboot / Power off entries of the AppBar power menu. Any future control whose action satisfies the destructive criterion above MUST also follow the rule.

#### Scenario: Destructive Button renders without a leading warning icon

- **WHEN** a page renders an MUI `<Button>` whose click triggers a destructive action (e.g. Format, fsck Repair, Reset WiFi, Delete rejected)
- **AND** the button has no `startIcon` prop, or its `startIcon` is something other than `<WarningAmberIcon />`
- **THEN** the button is updated to pass `startIcon={<WarningAmberIcon />}` so the icon is rendered to the left of the label inside the click target

#### Scenario: Destructive MenuItem renders without a leading warning icon

- **WHEN** the AppBar power menu (or any future menu) renders an MUI `<MenuItem>` whose selection triggers a destructive action (Stop LBB, Reboot, Power off)
- **AND** the item's content is the bare label without a leading `<WarningAmberIcon />`
- **THEN** the item is updated to wrap its content in a flex `<Box>` whose first child is `<WarningAmberIcon />` and whose second child is the existing label, so the icon precedes the label inside the menu row

#### Scenario: Destructive button on a touch viewport

- **WHEN** a user views a destructive action button on a mobile / touch viewport
- **THEN** the leading `<WarningAmberIcon />` is rendered alongside the button label without breaking onto a second line, because `startIcon` and the flex MenuItem layout both lay icon and label out horizontally

#### Scenario: Non-destructive error-coloured button

- **WHEN** a page renders an MUI `<Button color="error">` whose action is not destructive (for example a Cancel button in a dialog, or a "Stop a single running backup" button that simply terminates a single in-flight operation that the user can immediately restart)
- **THEN** the rule does not apply; the button MAY render without a leading warning icon

#### Scenario: Section-level warning cue is left unchanged

- **WHEN** a destructive action lives inside an `<Accordion>` whose `AccordionSummary` already shows a `<WarningAmberIcon />`, or beneath an `<Alert severity="warning">` banner
- **THEN** that section/banner cue is preserved as-is, and the per-button rule still adds a leading `<WarningAmberIcon />` to the destructive control inside, so both cues are present (section-level and control-level)
