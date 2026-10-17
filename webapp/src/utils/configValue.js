// Helpers for reading and writing config.cfg values on the client.
//
// The backend sends every config value as a string. Boolean settings are
// normalised to 'true' / 'false', but older config files written by other
// tools may still contain '1' / '0' (PHP's parse_ini_file representation), so
// comparisons go through isConfigTrue() instead of `=== 'true'`.

export function isConfigTrue(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  const normalised = String(value).trim().toLowerCase();
  return normalised === 'true' || normalised === '1' || normalised === 'yes' || normalised === 'on';
}

export function toConfigBool(checked) {
  return checked ? 'true' : 'false';
}

// Decode a base64 password value as stored by the PHP UI / lib_setup.py.
// Returns '' when the value is empty or not valid base64.
export function decodeConfigPassword(value) {
  if (!value || !String(value).trim()) return '';
  try {
    const binary = atob(String(value).trim());
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return '';
  }
}

export function encodeConfigPassword(value) {
  if (!value) return '';
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}
