import api from './api';

// Logs the backend allows (server/routes/log.js): the main log
// (const_LOGFILE) and the protected-command log (const_CMD_LOGFILE).
export const LOG_FILES = {
  main: 'little-backup-box.log',
  cmd: 'cmd.log',
};

export async function fetchLog(file = 'main') {
  const response = await api.get('/log', {
    params: { file },
    responseType: 'text',
    transformResponse: (data) => data,
  });
  return typeof response.data === 'string' ? response.data : '';
}

export function downloadText(filename, content) {
  const blob = new Blob([content || ''], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
