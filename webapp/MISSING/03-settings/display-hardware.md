# Settings — Display Hardware Configuration

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/setup.php` lines ~730–1000, `config.cfg` keys `conf_display_*`

---

## What the PHP implementation does

A comprehensive section for configuring the optional physical display hardware (e-ink,
OLED, TFT, or similar) attached to the Pi:

| Group | Settings |
|---|---|
| Enable / disable | Global toggle for the display |
| Font | Font size |
| Timing | Frame time (ms) |
| I²C / SPI | Interface type, I2C address, SPI device |
| Resolution | Width × height in pixels |
| Offsets | X / Y pixel offsets |
| Rotation | 0 / 90 / 180 / 270 degrees |
| Driver | Display driver name |
| Color model | RGB / BGR, inverse toggle |
| Contrast | 0–255 |
| Statusbar | Enable/disable, IP address repeat interval |
| Backlight | Enable/disable, GPIO pin |
| Colors | Foreground / background / highlight colors |

## What the webapp currently has

`UserInterface.jsx` includes a `<DisplayConfig />` component.  The extent of its
implementation was not fully audited — some fields may already be present.

## Gap

The full set of display hardware fields from `setup.php` should be verified against
`DisplayConfig.jsx`.  Any fields missing from the PHP list are gaps.

## Implementation notes

- Most of these settings are relevant only to users who have soldered/attached a display;
  they can be in a collapsible "Advanced display settings" accordion
- Config keys follow `conf_display_*`
