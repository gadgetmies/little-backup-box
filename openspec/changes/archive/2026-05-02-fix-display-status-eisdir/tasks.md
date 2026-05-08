## 1. Path helpers

- [x] 1.1 Add `getDisplayContentOldFilePath(workingDir, constants)` to `webapp/server/utils/paths.js`, returning `<tempDir>/display-content-old.txt`. Mirrors `getDisplayContentPath` in style.

## 2. Route handler

- [x] 2.1 Rewrite `webapp/server/routes/display.js` `GET /status`: import `readdirSync` and `getDisplayContentOldFilePath`; list `.txt` entries in the display-content directory; sort; read the last one; trim and return. Fall back to the old-file path when the directory is empty. Return `{status: ''}` on any error (preserve the existing swallow-and-return semantics).
- [x] 2.2 Manual sanity check: with `USE_MOCKS=true`, the response stays whatever the mock provides (no real-FS path is hit). With `USE_MOCKS=false` and a missing `tmp/display-content`, `{status: ''}` is returned without throwing.

## 3. Tests

- [x] 3.1 Add a Playwright assertion to an existing spec (or a small new `display-status.spec.js`) that visits `/`, waits for the polling cycle, and confirms the mock-provided status text ("Ready") is rendered as an `<Alert>` at the top of the page.

## 4. Verification

- [x] 4.1 Run `npm run lint` from `webapp/` — no new errors.
- [x] 4.2 Run `openspec validate --specs --changes` and confirm both green.
