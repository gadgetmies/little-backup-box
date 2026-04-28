# Plan 1 — Backup Page: Wire Existing Components

Spec: `specs/2026-04-28-plan1-backup-wiring.md`  
Depends on: nothing  
Estimated effort: 2–3 hours

---

## Slices

### Slice 1 — Shared async action hook + mock infrastructure

**Commit: "Add useAsyncAction hook and MockControls overlay"**

Files to create/change:
- `webapp/src/hooks/useAsyncAction.js` — new hook  
  - `isExecuting`: true immediately on `execute()`, reset in `finally`  
  - `showSpinner`: true after `loadingDelay` ms (default 300), reset in `finally`  
  - `error`: string | null, set on catch, cleared by `clearError()` or next `execute()`  
  - Returns `{ execute, isExecuting, showSpinner, error, clearError }`
- `webapp/src/utils/mockFailures.js` — new failure scenario registry  
  - Exports `MOCK_FAILURE_MODES` object with all named scenarios from shared-ui-patterns spec  
  - Exports `getActiveMockSettings()` reading from `localStorage` key `lbb-mock-controls`
- `webapp/src/utils/mockApi.js` — extend existing mock adapter  
  - On each intercepted request: read `lbb-mock-controls` from localStorage  
  - Apply `delay` (default 0 when MockControls not active)  
  - Apply failure mode if set: return matching error response  
- `webapp/src/components/MockControls.jsx` — new dev overlay  
  - Fixed position bottom-right, `zIndex: 9999`  
  - Collapsed by default (chevron icon to expand)  
  - Delay slider 0–5000ms, failure mode Select populated from `MOCK_FAILURE_MODES`  
  - Saves to `localStorage` key `lbb-mock-controls`  
  - Only rendered when `import.meta.env.VITE_USE_MOCK_API === 'true'`
- `webapp/src/App.jsx` — add `<MockControls />` at the bottom of the JSX tree
- `webapp/tests/e2e/fixtures/api-responses.js` — add helper `withMockDelay(response, ms)` for use in E2E fixtures
- `webapp/tests/e2e/mock-controls.spec.js` — E2E: MockControls overlay visible in mock mode; delay slider changes localStorage value

Verification:
- `npm run lint && npm run build` pass
- `npm run dev:mock` → MockControls overlay visible bottom-right
- Expand overlay → delay slider and failure selector present
- Set delay to 2000 → subsequent API calls delayed by ~2s

---

### Slice 2 — DatabaseOperations action buttons

**Commit: "Add Generate thumbnails, Sync database, Update EXIF buttons to DatabaseOperations"**

Files to change:
- `webapp/src/components/DatabaseOperations.jsx`  
  - Add three `Button` components using `useAsyncAction` (one per operation)  
  - Each button: disabled immediately on click, spinner after 300ms  
  - Inline `Alert severity="error"` below each button on failure  
  - Success → Snackbar toast  
  - Buttons label keys: `maintenance.database.generate_thumbnails`, `maintenance.database.sync`, `maintenance.database.update_exif`  
  - Each calls `POST /api/backup/function` with `{ function: <op>, target, presetSource, presetTarget, powerOff }`
- `webapp/src/utils/mockApi.js` — add mock for `POST /api/backup/function` when function is `generate_thumbnails`, `sync`, or `update_exif`:  
  - Happy path: 5 log lines streamed over configured delay, returns `{ success: true }`  
  - Failure modes: `disk_full`, `db_locked`, `permission_denied`, `partial_failure`
- `webapp/public/lang/en.json` — add missing translation keys for the three buttons
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English value as fallback
- `webapp/tests/e2e/backup-database-operations.spec.js` — new test file:  
  - Database Operations accordion opens  
  - Generate thumbnails button triggers loading state then shows success toast  
  - `disk_full` failure mode shows inline error Alert  

Verification:
- `npm run lint && npm run build` pass
- `npm run dev:mock` → expand Database Operations accordion → three buttons visible
- Click Generate thumbnails → button disabled immediately, spinner after ~300ms
- Set MockControls delay to 3000ms → spinner clearly visible
- Set failure to `disk_full` → inline error below that button only, other buttons unaffected
- `npx playwright test tests/e2e/backup-database-operations.spec.js`

---

### Slice 3 — Wire DatabaseOperations and FileOperations into Backup.jsx

**Commit: "Add DatabaseOperations and FileOperations sections to Backup page"**

Files to change:
- `webapp/src/pages/Backup.jsx`  
  - Import `DatabaseOperations` and `FileOperations`  
  - Render both below the existing backup controls, in this order:  
    1. `<DatabaseOperations />`  
    2. `<FileOperations />`  
  - Both are accordions collapsed by default — no change to their own components needed

Verification:
- `npm run dev:mock` → Backup page shows both new accordions
- Expand File Operations → rename button, warning alert, and target selector visible
- Expand Database Operations → three action buttons from Slice 2 visible
- All existing Backup page behaviour unchanged
- `npm run lint && npm run build` pass
