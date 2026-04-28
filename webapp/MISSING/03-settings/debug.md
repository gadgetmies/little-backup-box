# Settings — Debug Section

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/setup.php` lines ~1780–1840, `config.cfg` keys `conf_log_*`

---

## What the PHP implementation does

A debug/developer section at the bottom of settings:

| Setting | Description |
|---|---|
| Log level | ERROR / WARNING / INFO / DEBUG |
| Log sync | Flush log to disk after every line (performance impact, but ensures complete logs on crash) |
| Display images keep | Keep generated display images on disk (for debugging the physical display output) |

## What the webapp currently has

No debug section in the webapp settings.

## Gap

| PHP capability | Webapp status |
|---|---|
| Log level selector | Missing |
| Log sync toggle | Missing |
| Display images keep toggle | Missing |

## Implementation notes

- These are rarely needed; a collapsible "Developer / Debug" accordion at the bottom of
  Settings is appropriate
- Config keys: `conf_log_level`, `conf_log_sync`, `conf_display_images_keep`
