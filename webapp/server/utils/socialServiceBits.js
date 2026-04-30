// Per-service bit positions for the bitmask columns EXIF_DATA.social_publish
// and EXIF_DATA.social_published. Mirrors scripts/lib_socialmedia.py
// get_social_service_bit (lines ~145-157). The order is load-bearing — already
// persisted bitmask integers depend on it. A unit test (server/utils/__tests__)
// re-derives this map by shelling lib_socialmedia.py and asserts the JS map
// matches, so any drift fails CI rather than silently inverting filter results.
export const SOCIAL_SERVICE_BITS = Object.freeze({
  telegram: 0,
  mastodon: 1,
  bluesky: 2,
  matrix: 3,
});

export const SOCIAL_SERVICES = Object.freeze(Object.keys(SOCIAL_SERVICE_BITS));

export function maskFor(service) {
  const bit = SOCIAL_SERVICE_BITS[service];
  return bit === undefined ? null : 1 << bit;
}
