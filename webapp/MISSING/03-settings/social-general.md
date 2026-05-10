# Settings — Social Media General Settings

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/setup.php` lines ~1280–1330, `config.cfg` keys `conf_social_*`

---

## What the PHP implementation does

A "Social general" sub-section in settings controls behaviour that applies to all social
media publishing:

| Setting | Description |
|---|---|
| Publish date format | Format string for the date included in posts (e.g. `%Y-%m-%d`) |
| Publish filename in post | Toggle: include the original filename in the post text |

## What the webapp currently has

`ServiceConnections.jsx` has per-service Telegram, Mastodon, Bluesky, and Matrix config tabs
but no shared "social general" section.

## Gap

| PHP capability | Webapp status |
|---|---|
| Publish date format string | Missing |
| Include filename in post toggle | Missing |

## Implementation notes

- Small section; can be placed at the top of the Social Media tab in `ServiceConnections.jsx`
- Config keys: `conf_social_publish_date`, `conf_social_publish_filename`
