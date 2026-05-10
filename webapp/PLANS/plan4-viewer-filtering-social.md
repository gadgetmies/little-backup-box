# Plan 4 — Media Viewer: Filtering & Social Publish

Spec: `specs/2026-04-28-plan4-viewer-filtering-social.md`  
Depends on: Plans 2 & 3  
Estimated effort: 2–3 days

---

## Slices

### Slice 1 — Backend: filter-aware images route and camera-models route

**Commit: "Extend view/images route with filter params, add view/camera-models route"**

Files to change:
- `webapp/server/routes/view.js`
  - Extend `GET /api/view/images` to accept and forward to `lib_view.py`: `rating`, `type`, `ext`, `date`, `camera`, `social_status`, `published`
  - Add `GET /api/view/camera-models?medium=<m>` → calls `lib_view.py --action camera-models --medium <m>`; returns `{ models: [...] }`
- `webapp/src/utils/mockApi.js`
  - `GET /api/view/camera-models` → `{ models: ['Canon EOS R5', 'Sony A7IV', 'iPhone 15 Pro'] }`
  - `GET /api/view/images` with filter params → filter the fixture set client-side in mock (so filter actually reduces count visibly)
  - Failure mode `no_results` on filtered query → `{ images: [], total: 0, dbExists: true }`

Verification:
- `curl '/api/view/images?medium=usb&rating=5'` returns only 5-star images
- `curl '/api/view/camera-models?medium=usb'` returns model list

---

### Slice 2 — FilterBar component and URL serialisation

**Commit: "Add FilterBar component with URL-serialised state"**

Files to create/change:
- `webapp/src/components/FilterBar.jsx` — new component
  - Props: `{ filters, onChange, medium }` — controlled; parent owns state
  - MUI `Accordion` (collapsed on mobile xs/sm, expanded on md+)
  - Controls: rating `Select`, file type `Select`, extension `TextField`, date `DatePicker` (MUI X or native `<input type="date">`), camera model `Select`, social status `Select`, published `Select`
  - Camera model list passed as prop (fetched by parent)
  - "Clear all filters" `Button` at bottom; calls `onChange({})` and clears all fields
  - No async logic — pure controlled component
- `webapp/src/pages/View.jsx`
  - Add `filters` state object
  - On mount: initialise `filters`, `page`, `medium`, `sortField`, `sortDir` from URL query params (`useSearchParams`)
  - On any filter change: reset `page` to 1, update URL with `setSearchParams` (`{ replace: true }`)
  - On sort/pagination change: update URL similarly
  - Fetch camera models once when medium is selected; pass to `FilterBar`
  - Pass `filters` to `FilterBar`; on `onChange` update state + URL
  - Include active filters in `GET /api/view/images` query params
- `webapp/public/lang/en.json` — filter label translation keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/view-filtering.spec.js` — new test file:
  - Filter bar renders and collapses on mobile viewport
  - Rating filter reduces visible image count
  - Camera model filter populates from fixture data
  - URL params initialise filter state on fresh load
  - Clear filters restores full set
  - Filter change resets page to 1

Verification:
- `npm run dev:mock` → filter bar visible above grid
- Select rating ★★★★★ → grid reduces to 5-star images, URL shows `?rating=5`
- Copy URL, open new tab → same filter applied
- Change any filter → page resets to 1
- Clear all filters → full grid restored, URL params cleared
- Enable `no_results` → "No images match your filters" Alert with Clear button
- `npx playwright test tests/e2e/view-filtering.spec.js`

---

### Slice 3 — Backend: social publish route

**Commit: "Add view/publish API route"**

Files to change:
- `webapp/server/routes/view.js`
  - Add `POST /api/view/publish` — body: `{ medium, imageId, services: { [name]: bool } }`; updates publish columns in `EXIF_DATA` table via `lib_metadata.py`
- `webapp/src/utils/mockApi.js`
  - `POST /api/view/publish` → `{ success: true }` after delay
  - Extend image fixture records: add `publish_telegram`, `publish_mastodon` boolean fields
  - Failure modes: `service_not_configured` (400 `{ error: 'Service not configured' }`), `db_locked`

Verification:
- `curl -X POST /api/view/publish -d '{"medium":"usb","imageId":1,"services":{"telegram":true}}'` returns `{ success: true }`

---

### Slice 4 — SocialPublishPanel component

**Commit: "Add social publish checkboxes to single-image view"**

Files to create/change:
- `webapp/src/components/SocialPublishPanel.jsx` — new component
  - Props: `{ imageId, medium, publishState, onChange }`
  - Fetches available services once on mount from `GET /api/integrations/social/services` (verify this endpoint exists; if not, use `GET /api/config` and derive from configured service keys)
  - Renders one `FormControlLabel + Checkbox` per configured+enabled service
  - Does not render if no services configured
  - Saving: `useAsyncAction`, debounced 800ms, optimistic update, rollback on failure
  - Inline `Alert` on failure below the panel
- `webapp/src/pages/View.jsx`
  - Add `<SocialPublishPanel />` to single-image view, below comment field
  - Pass `imageId`, `medium`, current publish state from image record
  - On change: optimistically update image record in state
- `webapp/public/lang/en.json` — social publish label keys
- `webapp/public/lang/de.json`, `es.json`, `fi.json`, `fr.json` — same keys, English fallback
- `webapp/tests/e2e/view-filtering.spec.js` — extend:
  - Social publish checkboxes visible in single-image view
  - Checkbox toggles and saves
  - `service_not_configured` shows inline error and reverts

Verification:
- `npm run dev:mock` → single-image view shows Telegram and Mastodon checkboxes
- Check Telegram → updates immediately, saves in background
- Enable `service_not_configured` → checkbox reverts, inline error shown
- Enable `db_locked` → same rollback behaviour
