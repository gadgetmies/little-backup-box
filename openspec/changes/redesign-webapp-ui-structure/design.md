## Context

The webapp lives at `webapp/`, runs on Express + Vite + React + MUI v5, and routes nine pages through `webapp/src/App.jsx`. Decisions to be made here are almost entirely structural — they govern how features are organised, named, and disclosed. They do not change what scripts are invoked or how the device behaves.

Current state worth pinning down before we redesign:

- **Routes (App.jsx)**: `/` → `Backup`, `/setup` → `UserInterface`, `/tools` → `Filesystem`, `/sysinfo` → `System`, `/network` → `Network`, `/maintenance` → `Maintenance`, `/integrations` → `ServiceConnections`, `/scrape` → `ScrapedUI`, `/view` → `View`. The sidebar in `Menu.jsx` adds external links to `/files` and `/frame.php?page=rclone_gui`.
- **Dead pages**: `Home.jsx`, `Tools.jsx`, `SysInfo.jsx`, `Scrape.jsx`, `Integrations.jsx` exist in `webapp/src/pages/` but are not referenced by `App.jsx`. They duplicate logic from the routed siblings (e.g., `Home.jsx` is an older Backup page).
- **Heading scale**: pages use `h2`, `h3`, `h5`, `h6` interchangeably for "section title". `<PageSection>` does not exist. The AppBar already renders the page title via `getPageTitle()` in `Menu.jsx:428`, but several pages render *another* `<Typography variant="h2">` with the same text right under it.
- **Disclosure patterns**: `Backup.jsx` uses an `Accordion` for "Options"; `UserInterface.jsx` and `Network.jsx` use `Card` for peer sections; `ServiceConnections.jsx` stacks every config component vertically with no top-level grouping; `Maintenance.jsx` is 28 lines and currently underused. `localStorage` keys for accordion state are ad-hoc strings (`accordion-home-options`, `accordion-database-operations`).
- **Repeated form**: `Backup.jsx`, `DatabaseOperations.jsx`, `FileOperations.jsx`, and `SettingsOperations.jsx` each define their own "target storage + preset source/target partition + power off" controls.
- **Two stale site-map docs**: `webapp/.SITE_MAP.md` and `webapp/.SITE_MAP_IMPROVED.md` still reference the dead `Home.jsx` etc. and disagree with each other.
- **Constraint from CLAUDE.md**: MUI v5 is the only allowed component library; backend behaviour must continue calling the same scripts in `scripts/`; every user-visible string goes through `useLanguage().t(...)`.

## Goals / Non-Goals

**Goals:**

- Produce three documents — feature catalog, page map, UI pattern system — that are readable in order and that, between them, answer "what does this app do?", "where do I find it?", and "how should new sections be built?".
- Establish a single decision rubric for Card vs. Accordion vs. Tabs that is short enough to memorise and concrete enough to settle disagreements without re-litigation.
- Restructure existing pages so identical-looking groupings always use the same primitive, identical-looking controls always come from the same component, and there is exactly one h1 (the AppBar page title) per page.
- Delete dead page files and stale site-map docs in the same change so the new docs are unambiguously the source of truth.

**Non-Goals:**

- Visual redesign: no theme/colour/spacing changes, no new MUI tokens, no font scale changes beyond formalising the heading levels already in use.
- Backend or script changes: endpoints, payloads, and `scripts/` invocations stay as they are.
- The PHP scrape inside `/scrape`: structurally treated as a single embedded view; we do not restructure the snapshots.
- Accessibility audit beyond preserving current ARIA semantics — separate change if we want WCAG conformance work.
- Adding new features. If a page currently exposes capability X, the new structure also exposes X (even if from a different page or section).

## Decisions

### Decision 1: Document the catalog, page map, and pattern system as three plain Markdown files under `webapp/docs/`

- **Choice**: `webapp/docs/feature-catalog.md`, `webapp/docs/page-map.md`, `webapp/docs/ui-pattern-system.md`. Linked from a one-paragraph `webapp/docs/README.md` index. CLAUDE.md "UI library" section gets a pointer to `ui-pattern-system.md`.
- **Why**: We already have ad-hoc docs in `webapp/.PLANS/` and `webapp/.IMPLEMENTATION_DIFFERENCES.md`, but those are change-scoped. The three new files are *standing reference* and need to be discoverable without dot-prefixed hidden directories. Markdown matches existing conventions and renders on GitHub.
- **Alternatives considered**:
  - Storybook / MDX. Heavier dependency, doesn't replace the catalog (which is feature-centric, not component-centric), and we deliberately exclude visual-design work.
  - Inline JSDoc on each component. Page-map information has no natural home in a single component file.
  - Keeping `.SITE_MAP_IMPROVED.md`. It's incomplete, references dead files, and the dot-prefix hides it from default file browsers.

### Decision 2: Catalog organisation — by *user goal*, not by page or by component

- **Choice**: Top-level catalog sections are user goals: "Run a backup", "Browse and triage media", "Maintain stored media", "Configure connectivity (network/VPN)", "Configure integrations (cloud/social/mail)", "Configure device hardware (display/buttons)", "Manage device lifecycle (power/updates/system info)". Each leaf has fields: *Purpose*, *Audience*, *UI location* (page + section), *Backend* (script(s) and endpoint(s)), *Prerequisites*, *Related*.
- **Why**: A page-keyed catalog re-encodes the page map and gets out of date the moment we move a section. A user-goal taxonomy is the natural index when someone asks "where do I do X?". Page placement becomes a derived property maintained in the page map.
- **Alternatives considered**:
  - Component-keyed (one entry per `*.jsx`). Wrong granularity; users don't care about components.
  - Endpoint-keyed (one entry per API route). Backend-centric; many routes are implementation glue with no user-visible feature.

### Decision 3: Page map — eight routed pages, organised by task frequency

- **Choice**: Final route table:
  - `/` → **Backup** (run a backup, view running and recent runs)
  - `/view` → **Library** (browse, filter, rate, publish media)
  - `/maintenance` → **Maintenance** (database ops, file ops, settings backup, library cleanup, library restore)
  - `/integrations` → **Integrations** (cloud, social, mail, VPN — Tabs)
  - `/devices` → **Devices** (display, hardware buttons, button mapping — was `/setup` partly)
  - `/storage` → **Storage** (partitions, mount/unmount, format — was `/tools`)
  - `/network` → **Network** (Wi-Fi, hostname, services)
  - `/system` → **System** (sysinfo, updates, power, logs — merges `/sysinfo` content with admin tools currently in `/setup`)
  - `/preferences` → **Preferences** (UI language, theme, display behaviour — was the user-facing slice of `/setup`)
  - `/scrape` → **Legacy UI** (kept as-is, lower priority in nav)
- **Why**: Aligns route names with what they actually contain after the structural cleanup. Splits the current overloaded `/setup` (UserInterface) into "personal preferences" vs "device hardware" vs "system administration", which today bleed into each other. Promotes `/maintenance` from underused stub to the real home for the database/file/settings operations currently dumped on the Backup page. Sidebar order in `Menu.jsx` follows expected use frequency: Backup → Library → Maintenance → Integrations → Devices → Storage → Network → System → Preferences → Legacy UI → external links.
- **Alternatives considered**:
  - Keep current routes (route-stable mode). Rejected at scoping time per user direction; many of the structural pain points are *because* of the current page assignments.
  - Single-page settings hub `/settings` with internal tabs for everything. Tabs become a second nav layer; nine top-level routes are still cheaper to comprehend than one route with eight tabs of unrelated content.
  - Merge `/devices` into `/system`. Conflates "I am configuring the hardware on this Pi" with "I am administrating this Pi"; different mental modes.

### Decision 4: Legacy-route redirects via React Router for one release

- **Choice**: In `App.jsx`, each renamed/removed route registers a `<Route path="/setup" element={<Navigate to="/preferences" replace />} />` style redirect to its successor. Same for `/tools` → `/storage` and `/sysinfo` → `/system`. Redirects live for one release cycle and are removed in a follow-up change.
- **Why**: External documentation, screenshots, the README, and bookmarks reference the old paths. A redirect costs ~one line per renamed route and avoids breaking links during the rename. Using `<Navigate replace>` keeps the browser history clean.
- **Alternatives considered**:
  - Hard rename, no redirects. Cheaper to maintain but breaks every external link.
  - Permanent redirects. Adds permanent indirection that future readers have to chase. One-release deprecation is the standard pattern.

### Decision 5: UI pattern rubric

- **Choice**: A single short rubric in `ui-pattern-system.md`:
  - **Heading scale**: AppBar renders the only h1 (page title). `h2` = top-level page section. `h3` = subsection inside a section. `h4`–`h6` are not used. The new `<SectionHeader level={2|3}>` primitive enforces this.
  - **Card**: peer sections of similar weight, all visible at once, no progressive disclosure. Use Card when a page has 2–4 sections that the user typically wants visible together (e.g., Preferences page).
  - **Accordion**: progressively-disclosed groups that the user typically does *not* need to see by default. Default to collapsed; restore last-open state from `localStorage` keyed `lbb-accordion-<page>-<section>`. Use when a page has > 4 groupings or when a grouping is rarely needed (e.g., Backup "Options").
  - **Tabs**: mutually exclusive views of the *same* subject — pick exactly one at a time. Use when a page has 3+ peer panels and showing all at once would mean a long scroll of unrelated forms (e.g., Integrations: cloud / social / mail / VPN).
  - **PageSection**: the wrapping primitive — handles spacing, optional title, optional collapse-as-accordion behaviour. Pages compose `<PageSection>`s; they do not reach for `<Card>` or `<Accordion>` directly.
- **Why**: The current code mixes all three patterns *within* page sections that are conceptually identical. Naming the trigger condition for each pattern (peers? rare? exclusive?) gives reviewers something to point at. One wrapping primitive lets us change the implementation later without rewriting every page.
- **Alternatives considered**:
  - "Pick whichever fits" + style guide prose. That's what we have; it doesn't survive the third PR.
  - Hard-bind one primitive per page type. Too rigid; e.g., the Backup page genuinely benefits from a hybrid (Card-style top, Accordion-style options).

### Decision 6: Extract `BackupTargetSelector` shared component

- **Choice**: New `webapp/src/components/BackupTargetSelector.jsx` exposing the "target storage select + preset source partition + preset target partition + power-off checkbox" form, with props for which fields to show (`{ showPresetSource, showPresetTarget, showPowerOff, value, onChange }`) and the same inline `useEffect` that loads partitions and NVMe availability. `DatabaseOperations.jsx`, `FileOperations.jsx`, `SettingsOperations.jsx`, and `Backup.jsx` consume it.
- **Why**: The current four implementations of the same form are the clearest example of "implementation drift"-style bugs (e.g., NVMe availability is conditionally rendered in DatabaseOperations but not in others). Extracting it is a precondition for the section-implementation review delivering value.
- **Alternatives considered**:
  - Leave as-is and just document the duplication. Defers the cost; reviewer cannot enforce consistency on something not yet a single component.
  - Headless hook (`useBackupTargetForm`). Separates state from rendering, but the rendering is the part that drifts. A component is the right abstraction here.

### Decision 7: Sequencing — docs first, structure second, code third

- **Choice**: The work in `tasks.md` is ordered: (1) write `feature-catalog.md` from a code audit, (2) write `page-map.md` referencing the catalog, (3) write `ui-pattern-system.md`, (4) introduce `<PageSection>`/`<SectionHeader>` and `BackupTargetSelector`, (5) restructure pages one at a time in dependency order (`Maintenance` first because it absorbs content; `Backup` second because it sheds content; `Integrations` last because tabification is the largest single page change), (6) update routes and add redirects, (7) update i18n and tests, (8) delete dead files.
- **Why**: Doing structure before docs locks decisions in code that the docs then have to retrofit. Doing the primitives before the page rewrites means each page rewrite is small and reviewable. Doing redirects before deletes means no broken links during the change.
- **Alternatives considered**:
  - Per-page vertical slices (rewrite Backup end-to-end, then Maintenance, etc.). Faster to ship the first page but produces six different versions of the heading scale before the rubric exists.

## Risks / Trade-offs

- **[Test churn]** → Renaming routes invalidates `webapp/tests/e2e/*.spec.js` URLs. **Mitigation**: routes get redirect rules so old URLs still resolve; the test sweep happens in a single dedicated commit listed in tasks.md, not interleaved with the structural changes.
- **[i18n drift]** → Adding/removing translation keys across five language files is error-prone. **Mitigation**: a script step in tasks.md diffs key sets across all five files and fails CI if they diverge. Same approach already used in `webapp/.PLANS/` history.
- **[User confusion during rollout]** → Users who know the current page layout will go to `/setup` looking for theme settings and find a redirect to `/preferences`. **Mitigation**: redirect lands them on the right page; release notes call out the new map; the new sidebar order matches the new page-map document so the layout is internally consistent.
- **[Spec rot]** → A feature catalog tied to "every user-facing capability" is exactly the kind of doc that goes stale. **Mitigation**: the spec for `webapp-feature-catalog` requires a catalog entry change in the same PR that adds/moves/removes a feature; the rubric is short enough to enforce.
- **[Dead-file cleanup hides regressions]** → Deleting `Home.jsx` etc. could silently remove behaviour we forgot was still consumed somewhere. **Mitigation**: an explicit task verifies that nothing in `webapp/src/` imports the deleted pages before deletion (`grep -r "from '.*pages/Home'" webapp/src` etc.) and that no test references their routes.
- **[Tab navigation hides content]** → Putting Integrations under Tabs means a user looking for "rclone settings" might land on the Cloud tab and not realise mail is also there. **Mitigation**: tab labels are short and explicit (Cloud / Social / Mail / VPN); page header includes a one-line description naming all four; pattern system documents the tab-label naming rule.

## Migration Plan

1. Land the three docs first (feature catalog, page map, pattern system) as a single commit. They reference current paths only — no code changes yet. This lets the rest of the work proceed against a written target.
2. Land primitives (`<PageSection>`, `<SectionHeader>`, `BackupTargetSelector`) as a single commit. No page consumes them yet; this is purely additive.
3. Per-page restructures, each as its own commit in the order stated in Decision 7. Each commit updates the page, its tests, and any i18n keys it adds or removes.
4. Land the route changes and redirects as a single commit (touches `App.jsx` and `Menu.jsx`).
5. Land the i18n cleanup commit (remove obsolete keys, sync across languages).
6. Land the dead-file deletion commit (after grep-verification).
7. Update `CLAUDE.md` UI section pointer in the same commit that lands the pattern system, so the doc reference is never broken.

Rollback: each commit is independently revertable. The redirects in step 4 mean even reverting steps 3a–3h leaves the app navigable. The doc commit (step 1) is text-only and safe to keep on revert.

## Open Questions

- Should `<PageSection>` accept an `icon` prop for the section header, matching the icons currently used in the sidebar? Defer to first page that needs it.
- Should the Library page (`/view`) use Tabs to switch between Grid / Single / Map views? Out of scope; current UI is fine and Plan 04 owns that area.
- Should the AppBar page-title resolution move from a route-keyed map in `Menu.jsx:429` to a route-config object exported from `App.jsx`? Probably yes, but it's a refactor that deserves its own change; this one stays focused on structure.
