/**
 * Mock failure mode keys mapped to display labels.
 */
export const MOCK_FAILURE_MODES = {
  disk_full: 'Disk full',
  db_locked: 'Database locked',
  not_mounted: 'Not mounted',
  permission_denied: 'Permission denied',
  network_timeout: 'Network timeout',
  no_results: 'No results',
  partial_failure: 'Partial failure',
  service_not_configured: 'Service not configured',
  compile_failed: 'Compile failed',
  git_fetch_failed: 'Git fetch failed',
  gpio_conflict: 'GPIO conflict',
  invalid_timezone: 'Invalid timezone',
  file_missing: 'File missing',
};

/**
 * Read the active mock settings from localStorage.
 * @returns {{ delay: number, failureMode: string|null }}
 */
export function getActiveMockSettings() {
  try {
    const raw = localStorage.getItem('lbb-mock-controls');
    if (!raw) return { delay: 0, failureMode: null };
    const parsed = JSON.parse(raw);
    return {
      delay: typeof parsed.delay === 'number' ? parsed.delay : 0,
      failureMode: parsed.failureMode || null,
    };
  } catch {
    return { delay: 0, failureMode: null };
  }
}
