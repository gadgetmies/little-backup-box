# Settings — Popup Messages Toggle

**Priority:** 3 (Useful)  
**PHP source:** `scripts/setup.php` lines ~705–720, `config.cfg` key `conf_popup_messages`

---

## What the PHP implementation does

A boolean toggle that controls whether the UI shows popup/toast notification messages
(e.g. "Backup started", "Backup complete").  Some users find these distracting and prefer
to watch the log directly.

## What the webapp currently has

The webapp uses MUI `Snackbar` / `Alert` components for notifications but there is no
user-controlled setting to disable them.

## Gap

| PHP capability | Webapp status |
|---|---|
| Toggle to disable popup/toast messages globally | Missing |

## Implementation notes

- The setting value should be read from config on app load and stored in a React context
  so all components respect it without prop drilling
- Standard `conf_*` save pattern; boolean toggle in `UserInterface.jsx` settings
