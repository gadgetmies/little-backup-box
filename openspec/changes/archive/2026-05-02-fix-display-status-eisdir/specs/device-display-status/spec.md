## ADDED Requirements

### Requirement: `GET /api/display/status` returns the latest queued display message

The webapp backend SHALL expose `GET /api/display/status` that returns `{status: <string>}`, where the string is the contents of the most recent display frame the device-side scripts have written.

The handler SHALL treat the path identified by `getDisplayContentPath(workingDir, constants)` as a directory, list its `.txt` entries, sort them lexicographically, and read the last one. The filename convention is `<14-digit-uptime-centiseconds>.txt`, so lexicographic order matches chronological order.

#### Scenario: Directory contains queued frames

- **WHEN** the directory contains one or more `.txt` files
- **THEN** the handler reads the lexicographically last filename and returns its trimmed contents in `status`

#### Scenario: Directory is empty but old-file fallback exists

- **WHEN** the directory exists with zero `.txt` entries AND a sibling `display-content-old.txt` exists with non-empty contents
- **THEN** the handler returns the trimmed contents of `display-content-old.txt` in `status`

#### Scenario: Directory is missing or unreadable

- **WHEN** the directory does not exist, cannot be listed, or contains no readable content (and no fallback file)
- **THEN** the handler returns `{status: ''}` and does not throw

### Requirement: `<DisplayStatus>` renders only when status is non-empty

The React component `webapp/src/components/DisplayStatus.jsx` SHALL render an `<Alert severity="info">` when the polled status string is non-empty, and SHALL render nothing when the status is empty.

#### Scenario: Status is non-empty

- **WHEN** the polled response contains a non-empty `status` field
- **THEN** the component renders an info alert containing exactly that string

#### Scenario: Status is empty

- **WHEN** the polled response contains an empty `status` field, or the request fails
- **THEN** the component renders nothing (no alert, no placeholder)

### Requirement: Path helpers are centralised

`webapp/server/utils/paths.js` SHALL expose both `getDisplayContentPath(workingDir, constants)` (the directory) and `getDisplayContentOldFilePath(workingDir, constants)` (the sibling fallback file). The route handler SHALL NOT hardcode either filename.

#### Scenario: Route uses path helpers

- **WHEN** the display-status route handler resolves filesystem paths
- **THEN** it calls the helpers from `paths.js` and never literals `'display-content'` or `'display-content-old.txt'` inline
