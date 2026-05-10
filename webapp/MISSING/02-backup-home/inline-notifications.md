# Backup Home — Inline Telegram / Matrix Sections

**Priority:** 3 (Useful)  
**PHP source:** `scripts/index.php` lines ~500–560

---

## What the PHP implementation does

The PHP home page includes collapsed/expandable inline sections for **Telegram** and
**Matrix** that allow the user to quickly configure these services without navigating to the
full settings page.  This is a convenience shortcut — the same fields exist in `setup.php`.

## What the webapp currently has

Full Telegram and Matrix configuration is available in `ServiceConnections.jsx` (Social Media
tab).  There is no shortcut on the Backup home page.

## Gap

| PHP capability | Webapp status |
|---|---|
| Inline Telegram quick-config on home page | Missing |
| Inline Matrix quick-config on home page | Missing |

## Implementation notes

- This is a low-priority convenience duplication; the full configuration is already in the
  webapp under Service Connections
- If implemented, the home-page sections should be collapsed by default (MUI `Accordion`)
  and share the same API calls as the full settings page — no separate data model
- Consider whether the value justifies the added complexity; users can navigate to Service
  Connections in one tap
