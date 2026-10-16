import { useCallback } from 'react';
import { useConfig } from '../contexts/ConfigContext';

// Honour the "Show popup messages" preference (conf_POPUP_MESSAGES), mirroring
// scripts/sub-popup.php, which suppresses every informational popup when the
// setting is off. Errors and warnings are always shown.
//
// Usage:
//   const { notifyInfo } = usePopupMessages();
//   notifyInfo(setMessage, t('config.message_settings_saved'));
//
// `notifyInfo(setter, message)` calls `setter(message)` only when popups are
// enabled. `popupsEnabled` is exposed for components that render their own
// success <Alert>/<Snackbar> conditionally.
export default function usePopupMessages() {
  const { config } = useConfig();
  const raw = config?.conf_POPUP_MESSAGES;
  const popupsEnabled = !(raw === false || raw === 'false' || raw === '0' || raw === '');

  const notifyInfo = useCallback(
    (setter, message) => {
      if (popupsEnabled && typeof setter === 'function') {
        setter(message);
      }
    },
    [popupsEnabled],
  );

  return { popupsEnabled, notifyInfo };
}
