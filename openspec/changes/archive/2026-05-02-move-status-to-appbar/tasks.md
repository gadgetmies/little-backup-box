## 1. Backend severity

- [x] 1.1 Update `webapp/server/routes/display.js` to compute `severity` from the resolved status string (`'ready'` when empty or trimmed-equals `"Ready"`, else `'info'`) and return `{status, severity}`. Preserve all existing fall-through logic (queue → old-file → empty).

## 2. Mock fixture

- [x] 2.1 Update the `displayStatus` fixture in `webapp/src/utils/mockApi.js` to include `severity: 'ready'` alongside the existing `status: 'Ready'`.

## 3. Frontend component

- [x] 3.1 Create `webapp/src/components/StatusIndicator.jsx`. Owns its own `useEffect` polling the `/api/display/status` endpoint every 1 s. State: `{status, severity, visible}`. Renders an MUI `<IconButton size="small">` with `<CheckCircleOutlineIcon>` for `'ready'` and `<InfoOutlinedIcon>` for `'info'`. Click anchors an MUI `<Popover>` containing the status text (or `t('status.ready')` placeholder when empty). When the request fails (set `visible` false), render `null`.
- [x] 3.2 Mount `<StatusIndicator>` in `webapp/src/components/Menu.jsx` in the top-right toolbar `<Box>`, between the language `<MuiMenu>` and the theme `<Tooltip>` block.
- [x] 3.3 Remove the `import DisplayStatus` line and the `<DisplayStatus />` mount from `webapp/src/components/Layout.jsx`.
- [x] 3.4 Delete `webapp/src/components/DisplayStatus.jsx`.

## 4. i18n

- [x] 4.1 Add `status.tooltip` (`"Device status"`) and `status.ready` (`"Ready"`) to all five `webapp/public/lang/*.json` files. Use the English string for non-English files (existing convention). Re-run `npm run check:i18n` to confirm parity.

## 5. Tests

- [x] 5.1 Rewrite `webapp/tests/e2e/display-status.spec.js` to assert (a) the AppBar icon is visible, (b) clicking it opens a popover, (c) the popover renders the stubbed status text. Two `page.route` stubs: one returning `{status: 'Ready', severity: 'ready'}` and one returning `{status: 'Working', severity: 'info'}`. Verify the icon differs between the two states.
- [x] 5.2 Run `npx playwright test tests/e2e/display-status.spec.js` (after temporarily switching ports if 5173 is occupied) and confirm 6/6 across browsers.

## 6. Doc updates

- [x] 6.1 Update `webapp/docs/feature-catalog.md`: the "View device status" entry's UI location moves from the per-page top to "AppBar → status icon (between language and theme menus)".

## 7. Verification

- [x] 7.1 `npm run lint` from `webapp/` — no new errors.
- [x] 7.2 `openspec validate --specs --changes` — green.
- [x] 7.3 Final visual smoke deferred to manual testing (as with prior changes).
