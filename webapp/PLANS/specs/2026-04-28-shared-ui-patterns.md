# Shared UI Patterns — Async Actions, Loading States & Error Display

**Applies to:** All plans. Implemented in Plan 1, reused by all subsequent plans.

---

## 1. Async action loading pattern

Every user action that triggers backend processing must follow this two-variable pattern:

```js
const { execute, isExecuting, showSpinner, error, clearError } = useAsyncAction(fn, {
  loadingDelay: 300, // ms before spinner appears (prevents flicker)
});
```

- `isExecuting` — set `true` immediately on trigger. Use this to disable the triggering control.
- `showSpinner` — set `true` after `loadingDelay` ms. Use this to show the loading indicator.
- Both reset in `finally`. Actions completing in < 300ms never show a spinner.
- The hook is implemented in `webapp/src/hooks/useAsyncAction.js`.

### Button implementation

```jsx
<Button
  variant="contained"
  onClick={() => execute()}
  disabled={isExecuting}
  startIcon={showSpinner ? <CircularProgress size={18} /> : <ActionIcon />}
>
  {showSpinner ? t('common.loading') : t('action.label')}
</Button>
```

---

## 2. Error display — two-tier rule

### Errors (persistent, inline)

Render an `Alert severity="error"` directly below the control that failed. Persist until the
user dismisses it or the action succeeds. This makes it unambiguous which action failed.

```jsx
{error && (
  <Alert severity="error" onClose={clearError} sx={{ mt: 1 }}>
    {error}
  </Alert>
)}
```

### Success / info (transient, toast)

Use `Snackbar` with `autoHideDuration={4000}`. Consistent with the existing pattern in
`Backup.jsx`.

### Long-running operations with log streaming

Operations that stream output (thumbnail generation, LibRaw build, backup, database sync):
- Error summary in the inline `Alert`
- Full detail in the `LogMonitor` component
- The `Alert` appears above the `LogMonitor`

---

## 3. MockControls overlay

Visible only when `VITE_USE_MOCK_API=true`. Renders as a fixed overlay in the bottom-right
corner. Settings persisted to `localStorage` under `lbb-mock-controls`.

```jsx
// Rendered in App.jsx, conditionally
{import.meta.env.VITE_USE_MOCK_API === 'true' && <MockControls />}
```

Controls:
- **Delay slider** — 0–5000ms (default 1500ms). Applied to all mock responses.
- **Failure mode** — Off / named scenario (dropdown populated from `MOCK_FAILURE_MODES`).

### Named failure scenarios

Each mock endpoint registers its supported failure scenarios. The mock adapter applies them
when the matching scenario is active. Scenario names are referenced verbatim in plan
verification checklists.

| Scenario name | Meaning |
|---|---|
| `disk_full` | Operation fails with "Not enough disk space" |
| `db_locked` | SQLite DB locked by another process |
| `not_mounted` | Storage medium not mounted |
| `permission_denied` | File system permission error |
| `network_timeout` | Backend unreachable / request times out |
| `no_results` | Query returns empty set (valid state, not an error) |
| `partial_failure` | Operation completes but some items failed |
| `service_not_configured` | Required external service missing credentials |
| `compile_failed` | Build/compile step failed |
| `git_fetch_failed` | No internet / git remote unreachable |

---

## 4. Implementation location

| Artefact | Path |
|---|---|
| `useAsyncAction` hook | `webapp/src/hooks/useAsyncAction.js` |
| `MockControls` component | `webapp/src/components/MockControls.jsx` |
| Mock failure registry | `webapp/src/utils/mockFailures.js` |
| Mock adapter (extend existing) | `webapp/src/utils/mockApi.js` |
