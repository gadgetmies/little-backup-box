## Context

The webapp has a handful of destructive actions scattered across pages: Format and fsck Repair on `/storage`, Reset WiFi to AP mode on `/network`, Delete rejected images on `/view`, and Stop LBB / Reboot / Power off in the AppBar power menu. Today the visual cue that one of these actions is irreversible is uneven:

- `webapp/src/components/FileOperations.jsx:68` shows `<Alert severity="warning" icon={<WarningIcon />}>` next to the rename warning. (Banner-level cue, kept as-is.)
- `webapp/src/pages/Network.jsx:648` shows `<WarningAmberIcon color="warning" />` on the *accordion summary* of the WiFi-reset section. (Section-level cue, kept as-is.)
- The action buttons themselves (`Storage.jsx` Format/fsck Repair, `Network.jsx` Reset Button, `View.jsx` Delete rejected, `Menu.jsx` power-menu items) rely only on `color="error"` or red text — there is no second cue for users who skim the colour or are colour-impaired.

The pattern system spec (`openspec/specs/webapp-ui-pattern-system/spec.md`) is the right home for the rule: it already governs heading scale, Card/Accordion/Tabs choice, scrollable tab strips, and Save-button placement. Adding "destructive actions get a leading warning icon" alongside those rules keeps cross-page UI consistency in one place.

## Goals / Non-Goals

**Goals:**
- Ship a single rule, encoded in the pattern-system spec, that mandates a leading warning icon on every destructive action button (and destructive `MenuItem`).
- Bring the four known violators into compliance: Storage Format + fsck Repair, Network WiFi reset Button, View Delete rejected, AppBar power-menu items.
- Keep the visual treatment consistent (`<WarningAmberIcon color="warning" />`, sized to match the label) so the rule reads as a single pattern rather than five independent edits.

**Non-Goals:**
- Touching `Alert`-level warnings (the `FileOperations` Alert and the `Network` accordion-summary icon stay).
- Changing button colors, labels, or confirmation flows. The icon is purely additive.
- Defining a new `<DestructiveButton>` primitive. Three button call sites and one `MenuItem` is too few to justify a wrapper component; the rule is enforced by reading the spec, not by component coupling. We can revisit if the count grows.
- Adding new translation keys. The icon is decorative (`aria-hidden`); existing labels stay.
- A blanket rule that every error-coloured button must have a warning icon. The rule applies to *destructive* actions — operations that delete data, reformat storage, reboot/power off the device, or otherwise can't be undone with another click. A red Cancel button is not destructive.

## Decisions

### Decision 1: Use `WarningAmberIcon` over `WarningIcon`

`Network.jsx` already uses `WarningAmberIcon` (the outlined variant). The amber/outlined version reads as caution rather than alarm and pairs better with the small button labels we're decorating. The filled `WarningIcon` is already used inside Alerts elsewhere; reserving the amber/outlined version for inline-button use creates a clear visual split: filled icon → banner-level alert, outlined icon → action-level caution.

Alternatives considered:
- Use `WarningIcon` everywhere for uniformity. Rejected — losing the banner/inline split flattens the visual hierarchy.
- Use `ErrorOutlineIcon`. Rejected — it reads as "something has already gone wrong", not "this action is dangerous".

### Decision 2: Place the icon as a leading element next to the label, not as `startIcon`

For MUI `<Button>` we'll use `startIcon={<WarningAmberIcon />}` since that is the documented MUI prop and produces correct spacing automatically. For MUI `<MenuItem>` (in the power menu) there is no `startIcon` prop, so we'll wrap the existing label in a flex `<Box>` with the icon as the first child, mirroring the pattern Network.jsx already uses for the accordion summary.

This keeps the icon visually inside the click target so the user reads "⚠ Format" rather than "⚠ … Format" with whitespace.

### Decision 3: Keep the icon decorative

Set `aria-hidden="true"` on the icon (or rely on MUI's default — `SvgIcon` is `aria-hidden` by default unless given a `titleAccess`). The button's text label remains the accessible name. Screen-reader users get the same announcement they already do; sighted users get the second cue.

If we later decide screen-reader users also need the cue, we'd add a visually-hidden suffix like " (destructive)" rather than making the icon itself focusable.

### Decision 4: Encode the rule as a new requirement in `webapp-ui-pattern-system`, not a new capability

The change is purely an addition to an existing cross-cutting UI rulebook. There is no new capability boundary. Following the precedent of the scrollable-tabs and tab-persistence requirements, we add a single `### Requirement` block under `## ADDED Requirements`.

### Decision 5: No automated conformance check in this change

`webapp/tests/conformance/` exists but currently checks heading levels, not button construction. Writing an AST check that "every destructive button has a leading warning icon" requires defining "destructive" precisely in code, which leaks the rule's judgement boundary into a regex. We rely on the spec text + reviewer judgement for now, the same way the rest of the pattern-system rules are enforced. This is consistent with how `Card`/`Accordion`/`Tabs` choice is governed today.

If destructive-action drift becomes a problem we can revisit by introducing a `<DestructiveButton>` primitive and grepping for it; that's a strictly larger change.

## Risks / Trade-offs

- **Risk: subjective scope.** "Destructive" isn't algorithmic. Reset WiFi clearly qualifies; does Reload config also qualify? → Mitigation: spec scopes the rule to the four current sites by example and gives the criterion ("operation that cannot be undone with a follow-up click"). Future cases get judged on that bar.
- **Risk: visual noise on the AppBar power menu.** Three menu items in a row each gaining a warning icon could read as alarmist. → Mitigation: icon is small (`fontSize="small"`, matching the existing button-label weight), and all three items genuinely are destructive (they end the session / reboot / cut power), so the visual repetition matches reality.
- **Trade-off: no helper component.** Each call site adds the icon inline. If we add a fifth or sixth site, that's the moment to extract a `<DestructiveButton>` and `<DestructiveMenuItem>`. Three+one isn't worth it yet.

## Migration Plan

This is a frontend-only visual change. No persisted state, no API contract, no translation files touched. Deploys with the next webapp build; rolls back by reverting the change.

## Open Questions

None. The rule, the four call sites, and the icon choice are all settled by the decisions above.
