## Context

The Default backup modes matrix in `Preferences.jsx:311-367` is the only symmetric-axis configuration grid in the webapp. Rows are user-selectable backup *sources*, columns are user-selectable backup *targets*. Each cell that corresponds to a valid (source, target) combination renders an MUI `<Select>` with the `copy` / `move` choice; invalid combinations render an empty `<TableCell />`.

Three of the source identifiers (`usb`, `internal`, `nvme`) are also valid targets, so the matrix has an inherent shared-subset structure. The remaining identifier on the source side (`camera`) is source-only; the remaining identifiers on the target side (`cloud`, `rsync`) are target-only. Today the source list is `['camera', 'usb', 'internal', 'nvme']` (camera first) and the target list is `['usb', 'internal', 'nvme', 'cloud', 'rsync']`, which means the shared subset starts at row index 1 but column index 0. The (source == target) cells — which are intentionally blank because you cannot back up `usb` to itself, etc. — therefore render at (row 1, col 0), (row 2, col 1), (row 3, col 2). That is *a* diagonal, but it is the wrong one: it is off by one because of the camera offset, and it visually communicates nothing about "X cannot target X".

The backlog item ("Order the default-backup-modes table so columns and rows match") asks for this off-diagonal to become a true diagonal so the empty cells become a meaningful affordance instead of a layout artifact.

## Goals / Non-Goals

**Goals:**
- Make the `(source == target)` blank cells in the Default backup modes matrix sit on a true top-left-to-bottom-right diagonal in the shared 3×3 sub-grid so a reader immediately reads them as "self-backup is not a thing".
- Encode the alignment as a pattern-system rule (`Symmetric source/target matrices align shared axes at the same index`) so any future symmetric-axis grid composes the same affordance.
- Keep the change minimal: one array reorder in `Preferences.jsx`, one new requirement in the pattern-system spec, the corresponding rule mirrored into `webapp/docs/ui-pattern-system.md`, and the backlog bullet removed.

**Non-Goals:**
- Restructuring the matrix into multiple sub-tables (e.g. a separate camera band on top), changing the table component (MUI Table stays), or changing what cells are rendered (the `validCombinations` set is not touched).
- Renaming or reordering any `conf_default_backup_<source>_<target>` config key. The keys persist exactly as today.
- Changing the column order. Columns already place the shared subset at indices 0/1/2 followed by `cloud`, `rsync` as target-only suffixes.
- Translating any new strings. The same `config.source_*` and `config.target_*` keys are reused; only render order changes.
- Generalising the rule beyond symmetric source/target matrices. Other types of grid (e.g. a settings table where rows and columns share no semantics) are out of scope.

## Decisions

### D1. Camera goes last in `sources`, not first

The backlog text included a literal example — "put `camera` first as a row-only header" — but that example cannot satisfy the higher-level goal of "shared types align at the same index" without one of the following workarounds:

- **(a)** Insert an empty placeholder column before the targets so column indices line up with row indices `[camera=0, usb=1, internal=2, nvme=3]`. This produces an awkward empty leading column with no semantic meaning, and forces every reader to mentally skip past it.
- **(b)** Render `camera` as a separate band/sub-table above the main matrix, then render the shared 3×3 sub-grid plus the cloud/rsync suffix columns underneath. This is a much larger restructure, introduces a second `<Table>` or a row-spanning header, and changes the visual rhythm of the page for one row of cells.
- **(c)** Put `camera` last in `sources` so the shared subset occupies indices 0/1/2 on both axes. The shared sub-grid's self-pair diagonal aligns. `camera` becomes the bottom row instead of the top row — a small, isolated visual shift.

Choose **(c)**. It is the smallest possible diff (one array literal), keeps the JSX rendering loop unchanged, requires no new component, and leaves no orphan empty column. The trade-off is departing from the backlog's literal "camera first" example, but the example was illustrative ("e.g. …") and the explicit goal — make the diagonal meaningful — is what we optimise for.

### D2. Encode the rule in `webapp-ui-pattern-system`, not as a one-off comment

Even though the Default backup modes matrix is the only symmetric source/target grid in the webapp today, codify the rule in the `webapp-ui-pattern-system` spec rather than leaving it as a comment in `Preferences.jsx`. Rationale:

- The pattern system already encodes other "render this kind of thing this way" rules (heading scale, Card vs Accordion vs Tabs, destructive-action warning icons), several of which had only one or two call sites at the time they were introduced.
- Without an anchored rule, the next contributor adding a similar grid has nothing to look up; the alignment quietly regresses.
- A rule with one call site is cheap to maintain — when a second grid arrives, the rule is already there, and we don't need a follow-up "lift this convention into the spec" change.

The alternative — keep the change purely component-local and only mention the rule in the contributor doc — was considered and rejected for the same reason: the contributor doc mirrors the spec, not vice versa.

### D3. Don't change column order or `validCombinations`

The columns are already `['usb', 'internal', 'nvme', 'cloud', 'rsync']`, which places the shared subset at indices 0/1/2 with target-only suffixes 3/4. No change needed. `validCombinations` is the same set of valid (source, target) pairs regardless of which order we list `sources` in, so it stays untouched. This minimises the diff and keeps the change reviewable as "one array, one element moved from front to back".

### D4. Mirror the rule into `webapp/docs/ui-pattern-system.md` in the same change

The pattern-system spec is the source of truth, but contributors mostly read `webapp/docs/ui-pattern-system.md` first. The previous pattern-system additions (destructive-action warning icons, etc.) added the rule to both. Do the same here so contributors searching the docs find the rule, with a one-line cross-reference back to the spec for the formal scenarios.

## Risks / Trade-offs

- **Risk:** A user who has built muscle memory for "camera is the top row" sees the matrix and reads it differently than before. **Mitigation:** This is a niche page (per-source/target backup-mode defaults) used at most once per device setup; the columns are unchanged, the cells are unchanged, the labels are unchanged, and `camera` remains clearly labelled. Visual-position memory is unlikely to fail in practice; if it does, the new layout is more meaningful and the cost is one-time.
- **Risk:** A Playwright test that selects matrix cells by row index (e.g. `nth-child(2)` for "the camera row") breaks. **Mitigation:** Grep `tests/e2e/` for `default_backup_mode`, `source_camera`, and `nth-child` patterns under the matrix selector. If any tests are positionally coupled to the camera row, update them to select by an explicit row label or `data-testid`. The fixture data does not need to change.
- **Risk:** The pattern-system rule is added speculatively for N=1 and never picks up a second call site. **Mitigation:** Acceptable. The rule costs a single `### Requirement` block and a few scenarios; if a second matrix never arrives, the rule sits there documented and harmless. If a second matrix does arrive, we save the cost of inventing the rule then.
- **Trade-off:** Camera-last is a small departure from the backlog's literal example. **Why we accept it:** The backlog's *goal* (align shared types so the diagonal is meaningful) is what matters; the example was a sketch and is over-ridden by the goal.

## Migration Plan

No migration. The `conf_default_backup_<source>_<target>` config keys are unchanged, so existing user config persists across the change.
