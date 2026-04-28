# Settings — Idle Power-Off Timer

**Priority:** 3 (Useful)  
**PHP source:** `scripts/setup.php` lines ~370–395, `config.cfg` key `conf_idle_poweroff`

---

## What the PHP implementation does

A numeric input (in minutes, 0 = disabled) that schedules a system shutdown if no backup
has started within the configured idle period.  This is important for battery-powered
field use: if the user forgets to shut down the Pi after a backup, it powers off
automatically rather than draining the battery.

## What the webapp currently has

The Energy section in Settings does not include this field.  The config key exists on-device
but is not editable.

## Gap

| PHP capability | Webapp status |
|---|---|
| Idle power-off timer (minutes) input | Missing |

## Implementation notes

- Numeric input with `0` meaning "disabled"; a helper text label clarifies the unit
- Place in the Energy section of Settings
- Standard `conf_*` save pattern
