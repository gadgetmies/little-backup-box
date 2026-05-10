# Plan 4 — Media Viewer: Filtering & Social Publish

**Effort:** 2–3 days  
**Depends on:** Plans 2 & 3  
**Blocks:** nothing

---

## What this plan delivers

- Collapsible filter bar with 7 filter dimensions
- Filter state serialised in URL query params (bookmarkable / shareable)
- Page resets to 1 on any filter change
- Social publish checkboxes per configured service in single-image view
- Publish status persisted to SQLite

---

## Filter bar

### Component: `FilterBar.jsx`

Placed above the image grid in `View.jsx`. Collapsible via MUI `Accordion` (collapsed by
default on mobile, expanded by default on desktop).

| Filter | UI control | Values |
|---|---|---|
| Rating | `Select` | All / Reject / Unrated / ★ / ★★ / ★★★ / ★★★★ / ★★★★★ |
| File type | `Select` | All / JPG / RAW / HEIC / Video |
| Extension | `TextField` | Free text (e.g. `NEF`, `CR3`) |
| Date | `DatePicker` (MUI X) | Single date; clears with × button |
| Camera model | `Select` | All + list from DB |
| Social status | `Select` | All / Pending / Published |
| Published | `Select` | All / Yes / No |

Camera model list fetched once on mount from `GET /api/view/camera-models?medium=<m>`.

"Clear all filters" button resets all fields and removes query params.

### URL serialisation

Filter state is serialised to URL query params so links are bookmarkable:
`/view?medium=usb&rating=5&type=raw&page=2`

On mount, state is initialised from URL params. On filter change, URL is updated via
`useNavigate` with `{ replace: true }` (no history entry per keystroke).

---

## Filtering integration with pagination and sort

Filter changes always reset `page` to 1. The `GET /api/view/images` call includes all
active filter params alongside pagination and sort params.

```
GET /api/view/images?medium=usb&page=1&per_page=25&sort=date&dir=desc
  &rating=5&type=raw&ext=NEF&camera=Canon+EOS+R5
```

---

## Social publish checkboxes

### Component: `SocialPublishPanel.jsx`

Shown in single-image view below the comment field. Only renders if at least one social
service is configured and enabled.

Fetches configured services once on View mount from `GET /api/integrations/social/services`
(existing endpoint — verify it returns enabled services).

Renders one `FormControlLabel + Checkbox` per service, labelled with the service name and
icon.

Saving:
```
POST /api/view/publish
Body: { medium, imageId, services: { telegram: true, mastodon: false, ... } }
Returns: { success: true }
```

Uses `useAsyncAction`. Debounced 800ms.

Backend route calls `lib_metadata.py` or equivalent to update the `EXIF_DATA` table
`publish_*` columns.

---

## Backend routes

```
GET /api/view/camera-models?medium=<m>
  Returns: { models: ['Canon EOS R5', 'Sony A7IV', ...] }

POST /api/view/publish
  Body: { medium, imageId, services: { [name]: boolean } }
  Returns: { success: true }
```

Extend `GET /api/view/images` to accept filter query params and pass them to `lib_view.py`.

---

## Mock data additions

Fixture image records already have `rating` and `comment`. Add:
- `camera_model`: varied across fixture set (3–4 models)
- `file_type`: mix of jpg/raw/heic
- `publish_telegram`, `publish_mastodon`: boolean fields, varied

`GET /api/view/camera-models` → `{ models: ['Canon EOS R5', 'Sony A7IV', 'iPhone 15 Pro'] }`

`POST /api/view/publish` → `{ success: true }` after configured delay.

Failure modes:
- `no_results` on filtered query → empty grid with "No images match your filters" Alert and "Clear filters" button
- `service_not_configured` on publish save → inline error "Service not available"
- `db_locked` on publish save → inline error, checkbox reverts

---

## Verification

### 1. Static
- `npm run lint && npm run build` pass

### 2. Mock UI (`npm run dev:mock`)
- Filter bar visible above grid, collapsed on mobile
- Rating filter: select ★★★★★ → grid shows only 5-star images
- Camera model dropdown populated with 3 fixture models
- Selecting a model filters the grid
- Extension free-text "NEF" → filters to RAW NEF files
- Multiple active filters combine correctly
- "Clear all filters" resets grid to unfiltered
- Filter state reflected in URL bar (`/view?rating=5&ext=NEF`)
- Copy URL, open in new tab → same filters active
- Page resets to 1 when any filter changes
- Set delay 3000ms → grid shows spinner while filtered results load
- Enable `no_results` → "No images match your filters" with Clear button
- Single-image view: social checkboxes visible for Telegram, Mastodon
- Check Telegram → checkbox updates immediately (optimistic), saves in background
- Enable `service_not_configured` → inline error, checkbox reverts

### 3. E2E tests (`webapp/tests/e2e/view-filtering.spec.js`)
- Filter bar renders and collapses
- Rating filter reduces visible image count
- Camera model filter populates from fixture data
- URL params initialise filter state on load
- Clear filters restores full set
- Social publish checkbox toggles and saves

### 4. Real hardware
- Filter by camera model → only images from that camera shown
- Filter by rating = Reject → only rejected images shown
- Mark image for Telegram publish → survives page refresh
- Copy filtered URL, reopen → same filter state restored
