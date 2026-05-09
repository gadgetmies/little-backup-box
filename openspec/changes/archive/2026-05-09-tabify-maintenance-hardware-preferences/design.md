## Context

The webapp ships eight routed pages with multi-section content. Five of them (`/`, `/storage`, `/network`, `/system`, `/integrations`) render their sections under MUI Tabs. Three holdouts (`/maintenance`, `/hardware`, `/preferences`) still stack accordion or card sections vertically. The result is two competing IA conventions in the same app — users land on one shape, navigate to a peer page, and meet a different one. The pattern-system spec already mandates Tabs for pages with 3+ peer panels, so this is implementation drift, not a rule conflict.

The existing tab-page implementations are mostly consistent but diverged on one detail: how to persist the active tab. `Storage.jsx` and `Network.jsx` store the numeric index as a string (`'0'`, `'1'`, `'2'`); `System.jsx` and `Connections.jsx` use a symbolic mapping (`['device', 'cameras', 'updates', 'logs']`, with index↔name conversion at the boundary). The symbolic shape is more robust to tab reorders and additions, and is the shape this change codifies via a new pattern-system requirement.

Preferences (`/preferences`) is the wedge: it has only two sections today (Display + Backup defaults), which the pattern-system spec explicitly forbids from being Tabs ("two-panel page uses Tabs" is listed under the Tabs requirement as a *negative* scenario). Three options were considered (decided with the user before proposing): drop Preferences from this change; relax the spec to allow 2-tab pages; or split Preferences so it qualifies under the existing 3+ rule. The chosen option — split — is the only one that resolves the inconsistency without creating a new one.

## Goals / Non-Goals

**Goals:**

- Every multi-section page in the webapp uses Tabs.
- The Tabs persistence convention is codified, symbolic, and uniform — any future tab page gets it right by default.
- Preferences becomes spec-compliant by gaining a third tab, not by relaxing the spec.
- The existing tab-mobile-scrollability rule is honoured by all four new `<Tabs>` instances.

**Non-Goals:**

- Renaming any of the three pages or moving them in the sidebar.
- Restructuring the inner content of any tab body (other than the one Display→Display+Locale split that is necessary for the third tab).
- Migrating Storage / Network from numeric to symbolic persistence keys (out of scope; their existing keys keep working, and they will be addressed under "Audit existing pages against pattern-system" in the backlog).
- Changing the `<PageSection>` primitive's API or removing it. `<PageSection variant="card">` and `<PageSection variant="accordion">` are still legitimate primitives for non-page-level use; this change only converts page-level use on three pages.
- Surfacing the Save button per-tab. Preferences keeps its single page-level Save (it covers `formData` for all three tabs), matching the user expectation that "settings save together".

## Decisions

**Symbolic persistence keys, not numeric.**

Numeric indices break silently when tabs are reordered or inserted. A user who saved "tab 2" sees a different panel after a UI tweak. Symbolic keys (`'database'`, `'locale'`, `'fan'`) survive reorders and produce a clean fallback when a saved name no longer matches any tab. The new requirement in the pattern-system spec mandates the symbolic shape going forward; the older numeric pages stay as a deviation called out in the backlog.

**Preferences split: language + timezone become "Locale".**

Of the seven controls in today's "Display" PageSection, language and timezone are the only ones that aren't actually about display. Moving them out into a "Locale" tab also helps the Backup defaults tab feel less like the "everything else" bucket. Considered alternatives: (a) split Display by data type (Selects vs Checkboxes) — meaningless to the user; (b) make the tabs Display / Account / Backup defaults — "Account" is misleading on a single-user device. Locale is the only split that names a real user concern.

**`<PageSection>` is dropped at the page level for the converted pages.**

`<PageSection variant="card">` and `<PageSection variant="accordion">` add a header (`<SectionHeader>`) and a card or accordion wrapper. The Tabs strip already names each section (the tab label is the section name), and the AppBar already names the page. Wrapping each tab body in a redundant `<PageSection>` would re-introduce the redundant header the redesign just removed. Tab bodies are plain `<Box sx={{ pt: 3 }}>` wrappers, matching the convention in `System.jsx`.

**Single page-level Save on Preferences, not per-tab.**

`Preferences.jsx` keeps a unified `formData` state and a single Save button. Per-tab Save would (a) split a one-shot user action into three, (b) require independent dirty-tracking per tab, and (c) confuse the contract — language and timezone aren't really independent of theme; they are all "user settings". The Save button stays at the page footer, outside the `<TabPanel>`s, so it is visible regardless of which tab is active.

**Drop the per-section accordion-collapse persistence keys for Maintenance, do not migrate them.**

`lbb-accordion-maintenance-{database,files,settings}` and the legacy `accordion-database-operations` / `accordion-file-operations` keys become orphaned when Maintenance's accordions go away. The semantically meaningful action — "remember which section the user was looking at" — is replaced by `lbb-tabs-maintenance`. There is no clean mapping (a user could have *all* accordions expanded; a tab strip lets them see exactly one); migration is impossible by definition. The orphaned keys consume a few bytes in browser storage; not worth a cleanup script.

**Three new Playwright spec files, not one parametrised file.**

Each page's tab persistence test is a near-duplicate of `integrations-tabs.spec.js`. We could parametrise across a list of pages, but copy-paste keeps each spec file readable and self-contained, makes failures point at the right file in the report, and matches the existing convention (one spec file per logical area). Total cost: ~30 lines × 3 files.

## Risks / Trade-offs

- **Risk: Existing accordion-state users lose their setup.** → Acceptable. Maintenance's accordion-collapse memory is a UX nicety, not a data store. After this change, the user lands on whatever tab they last visited (or `database` first time), which is a strictly better UX than "the same accordions you collapsed last time, in a stack".
- **Risk: Preferences "Locale" feels artificial to users who never thought of language and timezone as a group.** → Worth the consistency win. The alternative — keeping Display as a 6-control catch-all — is what we're fixing. The Locale label is a single i18n entry that can be re-tuned without code changes if it doesn't land.
- **Risk: A future tab page reverts to numeric persistence keys.** → Mitigated by the new pattern-system requirement and the Playwright test, which asserts the localStorage value is the symbolic name, not the index.
- **Trade-off: Mixed persistence-key shapes in the codebase (numeric on Storage/Network, symbolic everywhere else).** → Tracked in `openspec/BACKLOG.md` "Audit existing pages against pattern-system" — the broader sweep migrates the older pages.

## Migration Plan

No backend or storage migration. Frontend-only implementation change.

- New `lbb-tabs-{maintenance,hardware,preferences}` keys are written on first interaction; on first load each page falls back to its first tab (index `0`).
- Orphaned `lbb-accordion-maintenance-*` and the two `accordion-*-operations` keys are left in place — they are inert.
- Translation key additions are additive; the en.json strings are committed in this change, with non-English bundles using the English fallback `value` until a native speaker reviews. The existing fallback chain in `useLanguage` already handles missing keys gracefully.

## Open Questions

- Whether the Preferences "Locale" tab should also house the date-format setting from `formData.conf_date_format` (if such a setting exists in the codebase and was buried somewhere). Resolving this requires a quick scan of `Preferences.jsx`'s remaining controls — flagged for the implementation step rather than this design.
