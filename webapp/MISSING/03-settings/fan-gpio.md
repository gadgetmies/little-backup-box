# Settings — Fan / GPIO Configuration

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/setup.php` lines ~1700–1740, `config.cfg` keys `conf_fan_*`

---

## What the PHP implementation does

Settings for a PWM-controlled cooling fan:

| Setting | Description |
|---|---|
| Fan PWM temperature threshold | CPU temperature (°C) at which the fan activates |
| GPIO pin | The GPIO pin number controlling the fan |

## What the webapp currently has

No fan/GPIO section in the webapp settings.

## Gap

| PHP capability | Webapp status |
|---|---|
| Fan PWM temperature threshold input | Missing |
| Fan GPIO pin input | Missing |

## Implementation notes

- Relevant only to users who have wired a fan; suitable for a collapsible "Hardware" section
- Config keys: `conf_fan_temp_threshold`, `conf_fan_gpio_pin`
- Temperature input should accept integers; GPIO pin input should accept valid BCM pin numbers
