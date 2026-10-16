// Frontend-only helpers for the Library page (URLs depend on the build mode).
import { mockAssetFor } from '../../utils/viewMockFixture.js';

const USE_STATIC_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';
const BASE_URL = (() => {
  const base = import.meta.env.BASE_URL || '/';
  return base.endsWith('/') ? base : `${base}/`;
})();

/**
 * URL of a media file for an EXIF_DATA row.
 * variant: 'thumb' | 'display' | 'original'
 *
 * The static GitHub Pages build has no backend, so it points at the bundled
 * sample files in public/mock-media instead of /api/view/image.
 */
export function mediaUrl(medium, image, variant, { download = false } = {}) {
  if (!image) return '';
  if (USE_STATIC_MOCK) {
    const asset = mockAssetFor(image, variant);
    return asset ? `${BASE_URL}mock-media/${asset}` : '';
  }
  const params = new URLSearchParams({ medium: medium || '', id: String(image.ID), variant });
  if (download) params.set('download', '1');
  return `/api/view/image?${params.toString()}`;
}

/** Fallback thumbnail for missing tims/ previews (view.php:1206). */
export const UNKNOWN_THUMB = USE_STATIC_MOCK ? `${BASE_URL}mock-media/unknown.jpg` : '/img/unknown.JPG';

/** Border used to mark a rating on cards and the stage (scripts/css/lbb.css:166-198). */
export function ratingBorderSx(rating) {
  const r = Number(rating);
  if (r === -1) return { border: '3px solid', borderColor: 'error.main' };
  if (r === 3) return { border: '4px solid #A97142' };
  if (r === 4) return { border: '4px solid #C0C0C0' };
  if (r === 5) return { border: '4px solid #D4AF37' };
  return { border: '4px solid transparent' };
}

export const SLIDESHOW_INTERVALS = [1, 2, 3, 4, 5, 10];

// Sentinel for "no value" (empty or NULL) in the camera and variable
// filters; must match NONE_VALUE in server/routes/view.js.
export const NONE_VALUE = '__none__';

export function countActiveFilters(filters) {
  return Object.entries(filters || {}).filter(([key, v]) => {
    if (key === 'varField') return false; // only counts once a value is picked
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  }).length;
}

/** State name for a service bit in the two bitmasks (view.php:313-324). */
export function socialState(publishMask, publishedMask, bit) {
  const mask = 1 << bit;
  const queued = (Number(publishMask) & mask) !== 0;
  const published = (Number(publishedMask) & mask) !== 0;
  if (queued && published) return 'combined';
  if (queued) return 'publish';
  if (published) return 'published';
  return 'nothing';
}
