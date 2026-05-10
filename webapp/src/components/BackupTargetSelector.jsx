import React, { useEffect, useState } from 'react';
import {
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  MenuItem,
  Select,
  Stack,
} from '@mui/material';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../utils/api';

const TARGETS = ['usb', 'internal', 'nvme'];

function BackupTargetSelector({
  value,
  onChange,
  showPresetSource = true,
  showPresetTarget = true,
  showPowerOff = true,
  disabled = false,
}) {
  const { t } = useLanguage();
  const [partitions, setPartitions] = useState([]);
  const [nvmeAvailable, setNvmeAvailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/backup/partitions')
      .then((response) => {
        if (!cancelled) setPartitions(response.data?.partitions || []);
      })
      .catch((err) => console.error('BackupTargetSelector: failed to load partitions:', err));
    api.get('/backup/services')
      .then((response) => {
        if (!cancelled) setNvmeAvailable(Boolean(response.data?.nvmeAvailable));
      })
      .catch((err) => console.error('BackupTargetSelector: failed to check NVMe availability:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  const targetLabel = (target) => {
    const labels = {
      usb: t('box.backup.mode.usb') || 'USB storage',
      internal: t('box.backup.mode.internal') || 'Int. storage',
      nvme: t('box.backup.mode.nvme') || 'NVMe SSD',
    };
    return labels[target] || target;
  };

  const update = (patch) => {
    onChange({ ...value, ...patch });
  };

  return (
    <Stack spacing={2}>
      <FormControl sx={{ maxWidth: 400 }} disabled={disabled}>
        <FormLabel>{t('maintenance.database.target') || 'Target storage'}</FormLabel>
        <Select
          value={value.target ?? 'usb'}
          onChange={(e) => update({ target: e.target.value })}
        >
          {TARGETS
            .filter((target) => target !== 'nvme' || nvmeAvailable)
            .map((target) => (
              <MenuItem key={target} value={target}>
                {targetLabel(target)}
              </MenuItem>
            ))}
        </Select>
      </FormControl>

      {showPresetSource && (
        <FormControl sx={{ maxWidth: 400 }} disabled={disabled}>
          <FormLabel>{t('main.backup.preset_source_label') || 'Set source partition'}</FormLabel>
          <Select
            value={value.presetSource ?? ''}
            onChange={(e) => update({ presetSource: e.target.value })}
          >
            <MenuItem value="">
              {t('main.backup.preset_partition_auto') || 'automatic selection'}
            </MenuItem>
            {partitions.map((p, i) => (
              <MenuItem key={i} value={p.identifier || ''}>
                {p.lum} {p.identifier ? `(${p.identifier})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {showPresetTarget && (
        <FormControl sx={{ maxWidth: 400 }} disabled={disabled}>
          <FormLabel>{t('main.backup.preset_target_label') || 'Set target partition'}</FormLabel>
          <Select
            value={value.presetTarget ?? ''}
            onChange={(e) => update({ presetTarget: e.target.value })}
          >
            <MenuItem value="">
              {t('main.backup.preset_partition_auto') || 'automatic selection'}
            </MenuItem>
            {partitions.map((p, i) => (
              <MenuItem key={i} value={p.identifier || ''}>
                {p.lum} {p.identifier ? `(${p.identifier})` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {showPowerOff && (
        <FormControlLabel
          control={
            <Checkbox
              checked={Boolean(value.powerOff)}
              onChange={(e) => update({ powerOff: e.target.checked })}
              disabled={disabled}
            />
          }
          label={t('main.backup.power_off_checkbox_label') || 'Turn off after run'}
        />
      )}
    </Stack>
  );
}

export default BackupTargetSelector;
