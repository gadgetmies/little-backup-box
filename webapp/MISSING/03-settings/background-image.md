# Settings — Background Image

**Priority:** 3 (Useful)  
**PHP source:** `scripts/setup.php` lines ~660–700, `config.cfg` key `conf_background_image`

---

## What the PHP implementation does

The user can select a background image for the viewer / UI from images already stored on
the device.  A file-picker or path input allows choosing an image file; the selected path is
stored in config.  The viewer and home page then apply it as a CSS background.

## What the webapp currently has

`UserInterface.jsx` has theme (light/dark/system) but no background image option.

## Gap

| PHP capability | Webapp status |
|---|---|
| Background image path selector | Missing |
| Apply selected image as UI background | Missing |

## Implementation notes

- Low visual priority for field use but useful for personalisation
- Implementation: a file-browser component that lists images from the device, or a free-text
  path input as the simpler alternative
- The image path is served as a static file via the existing media-serving route
