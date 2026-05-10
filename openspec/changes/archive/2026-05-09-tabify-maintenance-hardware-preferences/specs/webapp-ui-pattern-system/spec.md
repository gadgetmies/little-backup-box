## ADDED Requirements

### Requirement: Page-level Tabs persist the active tab under a symbolic localStorage key

Every page-level `<Tabs>` strip SHALL persist the user's last-active tab to `localStorage` under the key `lbb-tabs-<page-route-slug>` (for example `lbb-tabs-storage`, `lbb-tabs-system`, `lbb-tabs-maintenance`). The stored value MUST be the symbolic name of the tab (for example `'database'`, `'logs'`, `'locale'`) — never the numeric index — so that adding, removing, or reordering tabs in the React code never silently re-routes a user's saved selection to a different panel.

When the page renders, it SHALL read the stored value and select the tab whose symbolic name matches; if the stored value is absent or no longer matches any tab, the page SHALL fall back to the first tab (index `0`) without throwing.

This rule applies in addition to the existing Tabs requirements (3+ peer panels, short labels, header describes content, mobile scrollability).

#### Scenario: User selects a tab and reloads

- **WHEN** the user selects a non-default tab (for example "Files" on `/maintenance`)
- **AND** reloads the page
- **THEN** the same tab is selected after the reload
- **AND** `localStorage.getItem('lbb-tabs-maintenance')` returns the matching symbolic name (for example `'files'`)

#### Scenario: Tab order changes between deploys

- **WHEN** a code change reorders the tabs of a page (for example moves "Logs" from index 3 to index 0 of `/system`)
- **AND** a returning user has `localStorage` containing the prior selection (for example `lbb-tabs-system = 'logs'`)
- **THEN** the user still lands on the Logs tab after the deploy, because the persisted value is symbolic, not positional

#### Scenario: Persisted value no longer matches any tab

- **WHEN** a returning user has `localStorage` containing a value that no current tab uses (for example `lbb-tabs-maintenance = 'legacy'`)
- **THEN** the page renders the first tab (index `0`) without throwing
- **AND** the next user-driven tab change overwrites the stale value
