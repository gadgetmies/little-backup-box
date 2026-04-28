# Network — Comitup Reset

**Priority:** 4 (Advanced)  
**PHP source:** `scripts/cmd.php` lines ~200–240, `scripts/setup.php` lines ~1860–1900

---

## What the PHP implementation does

[Comitup](https://davesteele.github.io/comitup/) is the WiFi provisioning tool used to
configure the Pi's WiFi connection.  A "Reset Comitup" action erases the stored WiFi
credentials and reboots into AP mode, allowing the user to connect to the Pi's own hotspot
and re-enter WiFi details.

This is the recovery path when the LBB is taken to a new location with a different WiFi
network.

The action is available in both `cmd.php` (as a command) and `setup.php` (as a button in
the WiFi section).

## What the webapp currently has

`Network.jsx` has WiFi configuration fields but no Comitup reset button.

## Gap

| PHP capability | Webapp status |
|---|---|
| Comitup reset (erase WiFi credentials + reboot into AP mode) | Missing |

## Implementation notes

- This action is destructive (the user will lose the current WiFi connection and need to
  reconnect via the Pi's AP)
- Must have a clear confirmation dialog explaining the consequence
- Place in the WiFi section of `Network.jsx`, near the bottom
- The Node backend needs to call `comitup-cli` or the equivalent `systemctl` commands;
  after the reset the Pi reboots so no response is expected back
