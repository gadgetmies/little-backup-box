import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DownloadIcon from '@mui/icons-material/Download';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';
import SectionHeader from './SectionHeader';
import { downloadText, fetchLog, LOG_FILES } from '../utils/logs';

const POLL_MS = 1000;

/**
 * Two-step dialog for the commands scripts/cmd.php runs:
 *   1. confirm — consequence, device password (when required), optional
 *      "email me the result" (only when SMTP is configured, cmd.php:189-200);
 *   2. running — progress + the command log (const_CMD_LOGFILE) streamed by
 *      polling GET /api/log?file=cmd until GET /api/cmd/status reports done.
 *
 * `onConfirm({ password, mailResult })` must start the command (an api.post);
 * a 403 with code password_invalid / password_not_set is handled here.
 */
function ProtectedCommandDialog({
  open,
  onClose,
  title,
  consequence,
  details,
  actionLabel,
  onConfirm,
  requiresPassword = true,
  allowMail = true,
  destructive = true,
}) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [step, setStep] = useState('confirm');
  const [status, setStatus] = useState(null);
  const [password, setPassword] = useState('');
  const [mailResult, setMailResult] = useState(true);
  const [passwordError, setPasswordError] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const outputRef = useRef(null);
  const autoStartedRef = useRef(false);

  const loadStatus = useCallback(async () => {
    try {
      const response = await api.get('/cmd/status');
      setStatus(response.data || {});
      return response.data || {};
    } catch (err) {
      console.error('Failed to load command status:', err);
      setStatus({ passwordSet: false, mailConfigured: false });
      return null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep('confirm');
    setPassword('');
    setPasswordError('');
    setError('');
    setOutput('');
    setRunning(false);
    setMailResult(true);
    setStatus(null);
    autoStartedRef.current = false;
    loadStatus();
  }, [open, loadStatus]);

  const passwordSet = Boolean(status?.passwordSet);
  const mailAvailable = allowMail && Boolean(status?.mailConfigured);
  const blocked = requiresPassword && status !== null && !passwordSet;

  const start = useCallback(async () => {
    setSubmitting(true);
    setError('');
    setPasswordError('');
    try {
      await onConfirm({
        password: requiresPassword ? password : undefined,
        mailResult: mailAvailable && mailResult,
      });
      setOutput('');
      setRunning(true);
      setStep('running');
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'password_invalid') {
        setPasswordError(t('cmd.password_invalid'));
      } else if (code === 'password_not_set') {
        setStatus((prev) => ({ ...(prev || {}), passwordSet: false }));
      } else if (code === 'command_running') {
        setError(t('cmd.command_running'));
      } else {
        setError(err?.response?.data?.error || err?.message || t('cmd.start_error'));
      }
    } finally {
      setSubmitting(false);
    }
  }, [onConfirm, requiresPassword, password, mailAvailable, mailResult, t]);

  // Nothing to ask (no password, no mail option): start right away, like
  // cmd.php does for an unprotected command.
  useEffect(() => {
    if (!open || step !== 'confirm' || status === null || autoStartedRef.current) return;
    if (!requiresPassword && !mailAvailable) {
      autoStartedRef.current = true;
      start();
    }
  }, [open, step, status, requiresPassword, mailAvailable, start]);

  // Poll the command log and the run state while the command is running.
  useEffect(() => {
    if (!open || step !== 'running') return undefined;
    let cancelled = false;
    const tick = async () => {
      try {
        const [text, statusResponse] = await Promise.all([
          fetchLog('cmd'),
          api.get('/cmd/status'),
        ]);
        if (cancelled) return;
        setOutput(text);
        if (!statusResponse.data?.running) {
          setRunning(false);
        }
      } catch (err) {
        console.error('Failed to poll command output:', err);
      }
    };
    tick();
    const interval = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [open, step]);

  // One final read once the command has finished so the tail is complete.
  useEffect(() => {
    if (step !== 'running' || running) return;
    fetchLog('cmd').then(setOutput).catch(() => {});
  }, [step, running]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const goToSecurity = () => {
    try {
      window.localStorage.setItem('lbb-tabs-preferences', 'security');
    } catch {
      // ignore
    }
    onClose?.();
    navigate('/preferences');
  };

  const canSubmit =
    status !== null &&
    !submitting &&
    !blocked &&
    (!requiresPassword || password.length > 0);

  const titleIcon = destructive ? <WarningAmberIcon color="error" /> : null;

  return (
    <Dialog
      open={open}
      onClose={step === 'running' && running ? undefined : onClose}
      maxWidth={step === 'running' ? 'md' : 'sm'}
      fullWidth
      aria-labelledby="protected-command-title"
    >
      <DialogTitle id="protected-command-title" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {titleIcon}
        <Box component="span">{title}</Box>
      </DialogTitle>

      {step === 'confirm' && (
        <>
          <DialogContent>
            {consequence && <DialogContentText sx={{ mb: 2 }}>{consequence}</DialogContentText>}
            {details}
            {status === null && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                <CircularProgress size={28} />
              </Box>
            )}
            {blocked && (
              <Alert
                severity="warning"
                action={
                  <Button color="inherit" onClick={goToSecurity} sx={{ minHeight: 44 }}>
                    {t('cmd.password_set_link')}
                  </Button>
                }
              >
                {t('cmd.password_not_set')}
              </Alert>
            )}
            {requiresPassword && status !== null && passwordSet && (
              <TextField
                type="password"
                label={t('cmd.password_label')}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && canSubmit) start();
                }}
                error={Boolean(passwordError)}
                helperText={passwordError || t('cmd.password_helper')}
                autoComplete="current-password"
                autoFocus
                fullWidth
                margin="dense"
                inputProps={{ 'data-testid': 'protected-command-password' }}
              />
            )}
            {requiresPassword && status?.demoPassword && passwordSet && (
              <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
                {t('cmd.demo_password_hint')}: {status.demoPassword}
              </Typography>
            )}
            {mailAvailable && !blocked && (
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Checkbox checked={mailResult} onChange={(e) => setMailResult(e.target.checked)} />
                }
                label={t('cmd.mail_result_label')}
              />
            )}
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose} sx={{ minHeight: 44 }}>
              {t('main.cancel_button')}
            </Button>
            <Button
              onClick={start}
              variant="contained"
              color={destructive ? 'error' : 'primary'}
              disabled={!canSubmit}
              startIcon={
                submitting ? (
                  <CircularProgress size={18} color="inherit" />
                ) : destructive ? (
                  <WarningAmberIcon />
                ) : (
                  <PlayArrowIcon />
                )
              }
              sx={{ minHeight: 44 }}
              data-testid="protected-command-confirm"
            >
              {actionLabel}
            </Button>
          </DialogActions>
        </>
      )}

      {step === 'running' && (
        <>
          <DialogContent>
            {running ? (
              <LinearProgress sx={{ mb: 2 }} aria-label={t('cmd.running')} />
            ) : (
              <Alert severity="success" icon={<CheckCircleOutlineIcon />} sx={{ mb: 2 }}>
                {t('cmd.finished')}
              </Alert>
            )}
            {running && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                {t('cmd.running_hint')}
              </Typography>
            )}
            <SectionHeader level={3} title={t('cmd.output_header')} sx={{ mb: 1 }} />
            <Box
              ref={outputRef}
              component="pre"
              data-testid="protected-command-output"
              sx={{
                m: 0,
                p: 2,
                minHeight: 160,
                maxHeight: 360,
                overflow: 'auto',
                bgcolor: '#0b0f14',
                color: '#d7dde5',
                borderRadius: 1,
                fontFamily: 'monospace',
                fontSize: '0.8125rem',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {output || t('cmd.output_waiting')}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button
              startIcon={<DownloadIcon />}
              onClick={() => downloadText(LOG_FILES.cmd, output)}
              sx={{ minHeight: 44 }}
            >
              {t('log.download_button')}
            </Button>
            <Button onClick={onClose} variant="contained" sx={{ minHeight: 44 }}>
              {t('cmd.close_button')}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}

export default ProtectedCommandDialog;
