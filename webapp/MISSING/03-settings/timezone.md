# Settings — Timezone Selector

**Priority:** 3 (Useful)  
**PHP source:** `scripts/setup.php` lines ~180–220, `config.cfg` key `conf_timezone`

---

## What the PHP implementation does

A dropdown of all standard timezone identifiers (e.g. `Europe/Helsinki`, `America/New_York`)
lets the user set the system timezone.  This is important for correct date-stamping in the
viewer and for scheduled operations.

## What the webapp currently has

`UserInterface.jsx` has a language selector but no timezone selector.

## Gap

| PHP capability | Webapp status |
|---|---|
| Timezone dropdown (IANA timezone list) | Missing |

## Implementation notes

- The `Intl.supportedValuesOf('timeZone')` browser API provides the timezone list without
  a dependency; or a static JSON list of IANA zones can be bundled
- Setting the system timezone requires a privileged shell command on the Pi; the Node backend
  must invoke `timedatectl set-timezone <zone>` (or equivalent) after saving
- The config value is `conf_timezone`; saving follows the standard pattern
