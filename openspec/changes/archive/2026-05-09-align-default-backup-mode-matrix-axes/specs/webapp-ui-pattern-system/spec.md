## ADDED Requirements

### Requirement: Symmetric source/target matrices align shared axes at the same index

When a webapp page renders a configuration grid in which the row axis (sources) and the column axis (targets) share a subset of types — that is, the same identifier (e.g. `usb`, `internal`, `nvme`) is meaningful on both axes and the (source == target) cells are intentionally blank — the shared subset SHALL appear at the same index on both axes. Source-only types (rows whose identifier never appears as a column) SHALL be placed *after* the shared subset in the row list, and target-only types (columns whose identifier never appears as a row) SHALL be placed *after* the shared subset in the column list.

The intent is that the (source == target) blank cells form a true diagonal in the shared sub-grid, so a reader scanning the table immediately sees the "X cannot back up to itself" pattern. Off-diagonals introduced by source-only or target-only entries are acceptable because they fall *outside* the shared sub-grid.

The rule today applies to the "Default backup modes" matrix at `/preferences` (the only symmetric-axis configuration grid in the webapp). Any future grid with overlapping source/target axes MUST also follow it.

#### Scenario: Existing Default backup modes matrix renders shared axes off-diagonally

- **WHEN** the `/preferences` page renders the Default backup modes matrix and the rows are `[camera, usb, internal, nvme]` while the columns are `[usb, internal, nvme, cloud, rsync]`
- **THEN** the shared subset (`usb`, `internal`, `nvme`) is at row indices 1/2/3 but column indices 0/1/2, so the (source == target) blank cells fall on an off-diagonal that is a coincidence of the camera offset rather than a meaningful "self-backup is invalid" diagonal
- **AND** the rule requires the rows to be reordered to `[usb, internal, nvme, camera]` so the shared subset sits at indices 0/1/2 on both axes

#### Scenario: Renderer of a symmetric-axis grid places source-only rows last

- **WHEN** a page renders a configuration grid whose row list contains both shared types (also valid as targets) and source-only types
- **THEN** the source-only types appear in the row list *after* the shared types (e.g. `[<shared types in canonical order>, <source-only types>]`), so the shared subset starts at row index 0

#### Scenario: Renderer of a symmetric-axis grid places target-only columns last

- **WHEN** a page renders a configuration grid whose column list contains both shared types (also valid as sources) and target-only types
- **THEN** the target-only types appear in the column list *after* the shared types (e.g. `[<shared types in canonical order>, <target-only types>]`), so the shared subset starts at column index 0

#### Scenario: Self-pair cells form the shared sub-grid diagonal

- **WHEN** a reader looks at a symmetric-axis matrix that obeys the rule
- **THEN** the (source == target) cells (e.g. usb→usb, internal→internal, nvme→nvme) form a true top-left-to-bottom-right diagonal in the shared sub-grid, and those cells are rendered as empty `<TableCell />` because no `validCombinations` entry exists for self-pairs
