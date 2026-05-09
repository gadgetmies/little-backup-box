## Context

Three configuration pages (Connections / Network / Hardware) currently mix Save-button and autosave-on-change patterns inconsistently:

| Page / form | Today |
|---|---|
| Connections > Mail | Save button (inline, sticky on Mail tab only) |
| Connections > Rsync | Save button (inline, sticky on Cloud tab only) |
| Connections > Cloud per-remote | autosave, no last-saved guard → fires on mount (the reported bug) |
| Connections > Social general | autosave, has last-saved guard |
| Connections > CloudConfig (rclone services) | Save button (inside component, exposes state via `onSavedStateChange`) |
| Connections > SocialMediaConfig (per-service forms) | Save button (same pattern) |
| Network > WiFi country | autosave-on-change, no guard |
| Network > VPNConfig | Save button (inside component, no `onSavedStateChange` exposure) |
| Hardware > DisplayConfig | autosave-per-field via `updateConfig({ ...config, [key]: value })` |
| Hardware > ButtonHardwareConfig | autosave-per-field, same shape |
| Hardware > FanConfig | autosave-per-field, same shape |
| Preferences | debounced page-level autosave (recently introduced; user wants to keep this) |

The user-visible bug is the spurious "config.cfg was written successfully" toast on Connections load. The deeper UX issue is that autosave-on-change is wrong for transactional configs: a half-saved SMTP config is an actively broken state, not a "draft" the user wanted to keep.

The fix: standardise on a single sticky page-level Save button on all three pages, with autosave reserved for `/preferences` where each toggle is genuinely independent.

## Goals / Non-Goals

**Goals:**

- Every configuration form on `/integrations`, `/network`, `/hardware` saves only on explicit user click of one page-level Save button.
- The Save button is visible regardless of which tab the user is on.
- The Connections-load spurious-save bug is fixed as a side effect.
- The shared `<PageSaveBar>` primitive lives in one place; the three pages call into it identically.
- The pattern-system spec captures the rule so a future config page picks the right pattern by default.

**Non-Goals:**

- "Discard unsaved changes" / "you have unsaved changes" prompts on tab switch or sidebar navigation. Out of scope; can be a follow-up if dropped changes prove a problem in practice.
- Reworking the Backup-page Options accordion. The accordion's "Start backup" button already serves as an explicit transaction trigger.
- Visual redesign of the Save bar. The styling is copy-paste from the existing inline Save bar in `Connections.jsx:646-668`.
- Backend changes. `POST /api/config/save` already accepts an arbitrary key/value payload.
- Migrating Preferences to a Save button. The user's direction is explicit: independent toggles autosave; transactional configs use Save buttons.

## Decisions

**Approach B (refs over lifted state).**

Two architectures were considered:

- **A (lift state)**: every form's `formData` lives at the page level; sub-components are controlled via `(formData, onChange)` props. Page builds one merged payload and calls `updateConfig` once.
- **B (refs)**: every form keeps its own `formData` and `handleSave`. Each form exposes `(isDirty, handleSave)` to the page via the `onSavedStateChange` callback contract already used by `CloudConfig` and `SocialMediaConfig`. The page renders the Save bar with `isDirty = any-form-is-dirty` and on click calls `Promise.all(dirtyForms.map(f => f.save()))`.

Picked B. Reasons:

- The `onSavedStateChange` contract already exists for `CloudConfig` and `SocialMediaConfig`. Extending it to the other forms is mechanically simple.
- Lifting state would mean rewriting the internal shape of every sub-component — a much larger blast radius for the same user-visible result.
- Multiple sequential `updateConfig` calls vs one merged call is invisible to the user; the toast and disabled-button transitions land at the same time either way (Promise.all).
- The cost is one extra round-trip per form on save; for the 5–6 forms involved this is sub-100ms in practice on local network.

The trade-off is that "all-or-nothing" semantics aren't strictly atomic — a partial failure (one form saves, another fails) leaves the user in a half-saved state. **Decided with user (option a): per-form error toast on partial failure, dirty state preserved on failing forms so the user can retry.** Implementation: `Promise.allSettled` rather than `Promise.all`; iterate the results, mark `isSaved` only on successful forms; surface failures via the existing `setMessage` toast pipeline (concatenate "Failed to save Mail: ..." style messages). Successful forms transition to clean state independently, so the user can fix the validation issue on the failing form and retry without re-saving forms that already succeeded.

**`<PageSaveBar>` extracted as a shared component.**

The existing inline Save bar in `Connections.jsx:646-668` already has the right styling: fixed position, accounts for the drawer width on desktop, full-width on mobile. Extracting it removes duplication and gives the three pages an identical visual contract. Props: `isDirty`, `isSaving`, `onSave`, `drawerWidth`, plus an optional `secondaryAction` for the Mail-tab "Send test mail" button (which lives next to Save today and should keep doing so).

**Shared dirty-tracking helper, deferred.**

The `useFormSaveState` hook idea (combine `formData` + `lastSavedSnapshot` ref + `JSON.stringify` comparison) is appealing as it would deduplicate ~10 lines of identical boilerplate across 6+ forms. But each form has slightly different load logic (decode base64 password, derive defaults, etc.) that makes a clean shared hook harder than expected. Defer to a follow-up cleanup change unless the implementation reveals a clean shape during the first conversion.

**Autosave guard for `/preferences` — already correct.**

`Preferences.jsx` already has the `lastSavedConfig` ref + `isInitialMount` ref guards. The recent tabify change preserved these. No work needed there; the spec just documents what's already in place.

**Sub-component API: keep `onSavedStateChange` as the contract.**

Two callback signatures considered: `onSavedStateChange(isSaved, handleSave)` (current) vs `useImperativeHandle` ref forwarding. Keep the callback. Reasons: it's already proven on two components; React refs forwarded through `useImperativeHandle` are harder to compose; the callback shape gives the page exact information it needs without coupling to a specific imperative API.

The page tracks each form via:

```jsx
const [mailState, setMailState] = useState({ isSaved: true, save: null });
// ...
<MailConfig
  onSavedStateChange={(isSaved, save) => setMailState({ isSaved, save })}
/>
```

`isAnyDirty = ![mailState, rsyncState, ...].every(s => s.isSaved)`. `handleSavePage = () => Promise.all([mailState, ...].filter(s => !s.isSaved && s.save).map(s => s.save()))`.

**Hardware components — internal state, not lifted.**

`DisplayConfig`, `ButtonHardwareConfig`, `FanConfig` currently call `updateConfig(...)` directly on every field change. The conversion: introduce internal `formData` state (mirror of the relevant config keys), an internal `handleSave` that builds and posts the payload, and the `onSavedStateChange` callback. No prop API changes for the parent beyond adding `onSavedStateChange`.

This keeps the internal complexity contained and makes Hardware.jsx a thin orchestration layer (state refs + Save bar + 3 sub-components) — same shape as Connections.jsx ends up after the refactor.

## Risks / Trade-offs

- **Risk: User edits a field, switches tab, navigates away — change is silently discarded.** → Acceptable; same behaviour as today's per-tab Save buttons. A "you have unsaved changes" prompt would be a nice follow-up but is genuinely out of scope here. The Save bar's visibility on every tab actually *reduces* this risk vs today (today the Mail Save bar is invisible on the Cloud tab, so an edit-Mail-then-switch-tab flow already loses changes silently).
- **Risk: A partial save (one form succeeds, another fails) leaves half-applied state.** → Each form's config keys are independent on the backend, so each partial save is internally consistent. The Save bar surfaces the per-form failure and leaves the failing form dirty so the user can retry. Worst case is a slightly noisy error toast; no data corruption.
- **Risk: Sub-components that don't have `onSavedStateChange` today need careful conversion to avoid silent autosave regressions.** → Mitigated by the E2E test that asserts zero `POST /api/config/save` requests fire on page load and on tab navigation; if any sub-component still autosaves, the test fails immediately.
- **Trade-off: `Preferences` and the three multi-field pages now diverge mechanically (autosave vs Save button), which a future contributor could re-converge "for consistency" without realising the spec mandates the divergence.** → Mitigated by the spec rule itself, plus a comment in `Preferences.jsx` pointing at the spec section.
- **Trade-off: The Save bar's sticky positioning interacts with the existing per-tab "send test mail" button (Mail tab) and the planned MockControls panel.** → Resolved: the test-mail button rides along on the Save bar as a `secondaryAction`. MockControls already drops below the modal layer (`db75af2`); same z-index treatment for the Save bar.

## Migration Plan

Frontend-only refactor; no backend, schema, or storage migration. No localStorage keys change. The cloud-remote autosave's removal is purely a behaviour change — no data needs cleanup.

The change is large enough that per-page commits would be tempting, but the user's commit policy keeps related changes together (`CLAUDE.md` global rule). One commit covering: shared `<PageSaveBar>`, all three pages, all five sub-components, the spec delta, and the new E2E specs.

## Open Questions

- **Whether to expose a "Discard changes" button alongside Save.** Today the user can't revert local edits without reloading the page. Adding a button is small and useful, but it's an additive UX feature, not part of the bug-fix-and-unify mandate. Defer unless the implementation reveals a natural place to add it for free.
- **Whether to gate the Save bar behind `isSaving` in a more visible way (spinner overlay, locked tabs).** The existing `disabled={rsyncSaving}` on the Rsync button is the pattern; replicate for the page-level button. If saving routinely takes >1s in practice, a more prominent loading state may be worth adding later.
