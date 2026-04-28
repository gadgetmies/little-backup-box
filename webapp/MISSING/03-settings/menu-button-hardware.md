# Settings — Menu / Button Hardware Configuration

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/setup.php` lines ~1000–1080, `config.cfg` keys `conf_menu_*`

---

## What the PHP implementation does

Settings for physical navigation buttons wired to GPIO pins:

| Setting | Description |
|---|---|
| Enable buttons | Global toggle |
| Rotation | Button layout rotation (matches display rotation) |
| Button combinations | Mapping of button presses to actions |
| Bounce time | Debounce interval in ms |
| Edge detection | Rising / falling / both |
| Resistor pull | Pull-up / pull-down |

## What the webapp currently has

No menu/button hardware section was found in the webapp settings pages.

## Gap

| PHP capability | Webapp status |
|---|---|
| All menu/button hardware settings | Missing |

## Implementation notes

- Relevant only to users with physical buttons attached; suitable for a collapsible
  "Advanced hardware" accordion
- Config keys: `conf_menu_*`
- Button combination mapping is complex (multi-button chords → action names); a table
  editor component is the most usable approach
