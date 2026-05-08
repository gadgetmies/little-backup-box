# view-page-filtering Specification

## Purpose
TBD - created by archiving change expand-view-filters-and-thumbnails. Update Purpose after archive.
## Requirements
### Requirement: Directory filter

The FilterBar SHALL render a directory filter populated from `stats.directories`. When set, the value MUST be forwarded to `GET /api/view/images` as `directory=<value>` and result in only images whose `EXIF_DATA.Directory` exactly equals that value being returned.

#### Scenario: User picks a directory

- **WHEN** stats has been fetched and the user selects "DCIM/100EOS5D" from the directory dropdown
- **THEN** the next `/view/images` call MUST include `directory=DCIM/100EOS5D`
- **AND** the URL search params MUST contain `directory=DCIM%2F100EOS5D`

#### Scenario: Directory not in stats

- **WHEN** the URL contains `directory=does-not-exist` for the current medium
- **THEN** the page MUST still send the parameter to the backend and render whatever (possibly empty) result the backend returns, without crashing the dropdown

### Requirement: File-type extension filter

The FilterBar SHALL render a multi-select for file extensions populated from `stats.fileTypeExtensions`. The selection MUST be forwarded as a comma-separated `extension=` parameter and translate to a `File_Extension IN (…)` clause on the backend.

#### Scenario: User selects multiple extensions

- **WHEN** the user toggles "JPG" and "RAW" in the extension multi-select
- **THEN** the next `/view/images` call MUST include `extension=JPG,RAW`
- **AND** the result set MUST include only rows whose `File_Extension` is `JPG` or `RAW`

### Requirement: Social publish-status filters

The FilterBar SHALL render two controls — "Marked for publish" and "Already published" — each backed by a per-service multi-select for the four configured social services (telegram, mastodon, bluesky, matrix). Selections MUST be forwarded as `social_publish=<csv>` and `social_published=<csv>`. The publish state is stored as a bitmask integer in `EXIF_DATA.social_publish` and `EXIF_DATA.social_published`, with the per-service bit assignment defined by `scripts/lib_socialmedia.py` `get_social_service_bit`. The backend MUST translate each service name in the CSV into its corresponding bit and produce an OR-joined bitmask test (`(social_publish & <bit_a>) != 0 OR (social_publish & <bit_b>) != 0`), and MUST derive the bit map at runtime rather than inlining integers, so a future reorder of `get_social_service_bit` does not silently invert the filter.

#### Scenario: Filter to images marked for Bluesky publish

- **WHEN** the user picks "Bluesky" in the "Marked for publish" multi-select
- **THEN** the next `/view/images` call MUST include `social_publish=bluesky`
- **AND** the SQL MUST include `(social_publish & 4) != 0` (bluesky's bit at the time of writing is 2, so its mask is `1 << 2 = 4`), derived at runtime via the helper, not hard-coded
- **AND** the response MUST contain only rows whose `social_publish` integer has the bluesky bit set

#### Scenario: Combined publish + published filter

- **WHEN** the user picks "Telegram" in "Marked for publish" and "Mastodon" in "Already published"
- **THEN** the next `/view/images` call MUST include both `social_publish=telegram` and `social_published=mastodon`
- **AND** the backend MUST AND the two clauses (`(social_publish & telegram_bit) != 0 AND (social_published & mastodon_bit) != 0`) so only rows satisfying both conditions are returned

#### Scenario: Multiple services in one control

- **WHEN** the user picks both "Telegram" and "Bluesky" in "Marked for publish"
- **THEN** the next `/view/images` call MUST include `social_publish=telegram,bluesky`
- **AND** the backend MUST OR the per-service bitmask tests so a row flagged for either telegram or bluesky publish is included

### Requirement: Filter persistence and shareability

All FilterBar filter values (existing and newly added) MUST round-trip through `useSearchParams` so deep links restore the same view. URL search params MUST omit keys whose value is the default (empty string, empty array, or "all") to keep links short.

#### Scenario: Reload preserves filters

- **WHEN** the user has selected medium=`source_usb`, directory=`DCIM`, extension=`JPG,RAW`, and reloads the browser
- **THEN** the FilterBar MUST initialise with the same selections and `/view/images` MUST be called with the matching parameters on first render

#### Scenario: Default values stay out of the URL

- **WHEN** the user resets all filters via the existing reset button
- **THEN** the URL MUST NOT contain `directory=`, `extension=`, `social_publish=`, `social_published=`, or any other empty filter keys

### Requirement: Backend SQL handling

`GET /api/view/images` SHALL accept the parameters `directory`, `extension`, `social_publish`, `social_published` and translate them to inline sqlite WHERE clauses in the route handler, matching the strategy used by `scripts/view.php:595-611`. The handler MUST use parameterized queries (`?` placeholders) to prevent SQL injection. The dead `lib_view.py --action list` branch in `webapp/server/routes/view.js` MUST be removed; a single inline-sqlite path serves both the new `medium` shape (resolved to a `storagePath` via `path.join(req.constants.const_MEDIA_DIR, medium)`) and the legacy `storagePath` shape.

#### Scenario: Express route translates params to SQL

- **WHEN** a request `GET /api/view/images?medium=source_usb&directory=DCIM&extension=JPG&social_publish=telegram` reaches the route handler
- **THEN** the executed SQL MUST contain the clauses `Directory = ?` (param `'DCIM'`), `File_Type_Extension IN (?)` (param `'JPG'`), and `(social_publish & ?) != 0` (param `1` — telegram's bit is 0, so its mask is `1 << 0 = 1`)
- **AND** the handler MUST NOT spawn `python3 lib_view.py --action list` — that branch is removed

#### Scenario: Multiple extensions become an IN clause

- **WHEN** the request includes `extension=JPG,RAW,MP4`
- **THEN** the SQL MUST contain `File_Type_Extension IN (?, ?, ?)` with the three values bound as parameters in order

### Requirement: Stats endpoint surfaces social aggregates

`GET /api/view/stats` SHALL return two new arrays — `socialPublishPending` and `socialPublished` — each shaped `[{ service, count }, …]` covering the four configured services. Counts MUST be computed by bitmask test against the integer columns `EXIF_DATA.social_publish` and `EXIF_DATA.social_published` (`SELECT COUNT(*) FROM EXIF_DATA WHERE (social_publish & <bit_for_service>) != 0` per service). The existing `directories` and `fileTypeExtensions` arrays remain unchanged.

#### Scenario: Stats response includes social counts

- **WHEN** a client calls `GET /api/view/stats?medium=source_usb` against a database with 3 images whose `social_publish` integer has the telegram bit set and 1 image whose `social_published` integer has the mastodon bit set
- **THEN** the response MUST include `"socialPublishPending": [{"service":"telegram","count":3}, …]` and `"socialPublished": [{"service":"mastodon","count":1}, …]`
- **AND** services with zero count MUST still appear in the array (with `count: 0`) so the FilterBar can render a complete service list with disabled-but-visible options

### Requirement: Mock parity

The mock layers (`webapp/server/utils/mockSystem.js` for backend mocks, `webapp/src/utils/mockApi.js` for browser mocks) SHALL recognise the new query parameters and return deterministic filtered results so e2e tests and the GitHub Pages preview behave identically to the real backend.

#### Scenario: Mock filters by extension

- **WHEN** the static mock build is queried with `GET /api/view/images?extension=RAW` against the seed dataset
- **THEN** the returned `images` array MUST contain only entries whose `File_Extension` is `RAW`

