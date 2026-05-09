## ADDED Requirements

### Requirement: Multi-field configuration pages use a single page-level Save button; independent-toggle pages may autosave

Configuration pages SHALL fall into one of two categories, and the category determines the save UX:

**Multi-field configuration pages**: pages whose forms are *transactional units* — collections of related fields that are meaningful only when applied together (an SMTP server config, a WiFi config, a fan PWM curve, a cloud-remote config). On these pages:

- The page MUST render exactly one Save button using the shared `<PageSaveBar>` primitive at `webapp/src/components/PageSaveBar.jsx`. The bar is sticky to the bottom of the viewport and visible on every tab of the page.
- Field changes MUST NOT trigger any `updateConfig` (or equivalent backend save) call on their own. Saves only happen on user click of the page-level Save button.
- The Save button is enabled iff *any* form on the page is dirty (i.e., its current state differs from its last-saved snapshot).
- A single click of the Save button persists every dirty form on the page. Implementations MAY issue one `updateConfig` call with a merged payload, or several parallel calls — the user-visible behaviour is the same: one click, all-or-nothing.
- Every form on the page exposes its `(isDirty, save)` state to the page via the `onSavedStateChange(isSaved, handleSave)` callback contract already used by `CloudConfig`, `SocialMediaConfig` (and extended to `DisplayConfig`, `ButtonHardwareConfig`, `FanConfig`, `VPNConfig` by this change).

The four current pages in this category are `/integrations`, `/network`, `/hardware` (each MUST use the page-level Save button) plus any future page composing transactional configuration forms.

**Independent-toggle pages**: pages whose fields are each *self-contained user preferences* whose effect is immediate and isolated (theme, language, timezone, popup-on/off, virtual-keyboard-on/off). On these pages:

- The page MAY autosave on field change (debounced page-wide, not per-field). The single current page in this category is `/preferences`.
- Autosave MUST be guarded by a last-saved snapshot so the load transition (config arrives → form state populates) does not trigger a save.

#### Scenario: Multi-field page on initial load

- **WHEN** the user opens `/integrations` (or `/network` or `/hardware`) and the page loads its current `config` values
- **THEN** zero `POST /api/config/save` (or equivalent `updateConfig`) requests are issued
- **AND** no "Settings saved" toast appears
- **AND** the page-level Save button is rendered disabled (no form is dirty)

#### Scenario: User edits multiple tabs and saves once

- **WHEN** the user opens `/integrations`, edits a field on the Cloud tab, switches to the Mail tab, edits a field there, and clicks the page-level Save button
- **THEN** `updateConfig` is called once (or in parallel for the dirty forms) with both edits in the resulting payload
- **AND** the Save button transitions to disabled after the request resolves
- **AND** a single "Settings saved" toast appears

#### Scenario: User navigates away with unsaved changes

- **WHEN** the user has unsaved changes on `/network` and clicks a different sidebar item
- **THEN** the change is silently discarded (no confirmation prompt — out of scope for this change)
- **AND** when the user returns, the page renders the last persisted config values

#### Scenario: Independent-toggle page on initial load

- **WHEN** the user opens `/preferences` and the page loads its current `config` values
- **THEN** zero `POST /api/config/save` requests are issued
- **AND** no "Settings saved" toast appears
- **AND** field changes after this point trigger a single debounced `updateConfig` call with the changed fields
