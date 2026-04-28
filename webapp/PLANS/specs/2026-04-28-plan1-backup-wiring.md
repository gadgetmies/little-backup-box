# Plan 1 — Backup Page: Wire Existing Components

**Effort:** ~2–3 hours  
**Depends on:** nothing  
**Blocks:** nothing (independent quick win)

---

## What this plan delivers

- `DatabaseOperations.jsx` gains the three missing action buttons
- `DatabaseOperations` and `FileOperations` are imported into `Backup.jsx`
- Shared `useAsyncAction` hook and `MockControls` overlay are built here for all subsequent plans
- Mock endpoints and failure modes for these operations are wired up

---

## Components affected

| File | Change |
|---|---|
| `webapp/src/components/DatabaseOperations.jsx` | Add Generate thumbnails / Sync database / Update EXIF buttons |
| `webapp/src/pages/Backup.jsx` | Import and render `DatabaseOperations` and `FileOperations` |
| `webapp/src/hooks/useAsyncAction.js` | **New** — shared async action hook |
| `webapp/src/components/MockControls.jsx` | **New** — dev overlay |
| `webapp/src/utils/mockFailures.js` | **New** — failure scenario registry |
| `webapp/src/utils/mockApi.js` | Extend: add delay + failure mode support |
| `webapp/src/App.jsx` | Render `<MockControls />` conditionally |

---

## DatabaseOperations action buttons

Three buttons inside the existing `AccordionDetails`, below the current selectors:

| Button | Label key | Backend call | Script invoked |
|---|---|---|---|
| Generate thumbnails | `maintenance.database.generate_thumbnails` | `POST /api/backup/function` `{ function: 'generate_thumbnails', target, ... }` | `lib_view.py` |
| Sync database | `maintenance.database.sync` | `POST /api/backup/function` `{ function: 'sync', target, ... }` | `lib_view.py` |
| Update EXIF | `maintenance.database.update_exif` | `POST /api/backup/function` `{ function: 'update_exif', target, ... }` | `lib_metadata.py` |

Each button uses `useAsyncAction`. All three disable independently — triggering one does not
disable the others (they share the same target, but operate on different data).

The response streams log output. Route `/api/backup/function` already exists; verify it
handles all three function names. If not, extend it.

---

## useAsyncAction hook spec

```js
// webapp/src/hooks/useAsyncAction.js
function useAsyncAction(fn, { loadingDelay = 300 } = {}) {
  // Returns: { execute, isExecuting, showSpinner, error, clearError }
  // - isExecuting: true immediately on execute(), resets in finally
  // - showSpinner: true after loadingDelay ms, resets in finally
  // - error: string | null, set on catch, cleared by clearError() or next execute()
}
```

---

## MockControls spec

Rendered in `App.jsx`:
```jsx
{import.meta.env.VITE_USE_MOCK_API === 'true' && <MockControls />}
```

Fixed position, bottom-right, `zIndex: 9999`. Collapsed by default (expand icon). When
expanded shows delay slider and failure mode selector. Settings in `localStorage` key
`lbb-mock-controls`.

---

## Mock endpoints to add

`POST /api/backup/function` for `generate_thumbnails`, `sync`, `update_exif`:
- Happy path: streams 5 log lines over the configured delay, returns `{ success: true }`
- Failure modes: `disk_full`, `db_locked`, `permission_denied`, `partial_failure`

---

## Placement in Backup.jsx

Below the existing backup controls accordion, in order:
1. `<DatabaseOperations />` (accordion, collapsed by default — matches existing behaviour)
2. `<FileOperations />` (accordion, collapsed by default)

---

## Verification

### 1. Static
- `npm run lint` — no new warnings
- `npm run build` — succeeds

### 2. Mock UI (`npm run dev:mock`)
- MockControls overlay visible in bottom-right corner
- Backup page shows "Database Operations" and "File Operations" accordions
- Expand Database Operations → three buttons visible, target selector works
- Click "Generate thumbnails" → button disabled immediately, spinner appears after ~300ms, log lines stream in LogMonitor
- Action completes → button re-enabled, success toast appears
- Expand File Operations → rename button and warning present
- Set delay to 3000ms in MockControls → spinner appears on all three DB buttons
- Enable `disk_full` failure → error Alert appears below the triggered button only; other buttons unaffected
- Enable `db_locked` → distinct error message shown
- Enable `partial_failure` → success toast with warning text, partial log output

### 3. E2E tests to add (`webapp/tests/e2e/backup-database-operations.spec.js`)
- Database Operations accordion opens
- Generate thumbnails button triggers loading state then shows success
- disk_full failure mode shows inline error Alert
- FileOperations accordion opens and rename button is present

### 4. Real hardware
- Generate thumbnails on a USB drive that has backed-up images → thumbnails appear in View page
- Sync database after manually deleting a file on the drive → deleted file removed from DB
- Update EXIF after changing EXIF data externally → DB updated
