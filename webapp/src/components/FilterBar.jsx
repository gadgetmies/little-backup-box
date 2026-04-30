import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ListItemText,
  OutlinedInput,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import FilterListOffIcon from '@mui/icons-material/FilterListOff';
import { useLanguage } from '../contexts/LanguageContext';

const RATING_OPTIONS = [
  { value: 'all', label: null },
  { value: '-1', label: null },
  { value: '0', label: null },
  { value: '1', label: '★' },
  { value: '2', label: '★★' },
  { value: '3', label: '★★★' },
  { value: '4', label: '★★★★' },
  { value: '5', label: '★★★★★' },
];

export const DEFAULT_FILTERS = {
  ratings: [],
  dateFrom: '',
  dateTo: '',
  filename: '',
  camera: '',
  fileType: '',
  directory: '',
  extension: [],
  socialPublish: [],
  socialPublished: [],
};

function FilterBar({ filters, onFiltersChange, stats }) {
  const { t } = useLanguage();
  const [filenameInput, setFilenameInput] = useState(filters.filename || '');

  // Debounce filename input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filenameInput !== filters.filename) {
        onFiltersChange({ ...filters, filename: filenameInput });
      }
    }, 300);
    return () => clearTimeout(timer);
    // intentionally omitting filters/onFiltersChange to avoid re-triggering on every keystroke
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filenameInput]);

  // Sync filenameInput when filters.filename changes externally (e.g. reset)
  useEffect(() => {
    if (filters.filename !== filenameInput) {
      setFilenameInput(filters.filename || '');
    }
  }, [filters.filename]);

  const handleRatingToggle = useCallback(
    (value) => {
      const current = filters.ratings || [];
      const next = current.includes(value) ? current.filter((r) => r !== value) : [...current, value];
      onFiltersChange({ ...filters, ratings: next });
    },
    [filters, onFiltersChange]
  );

  const handleReset = useCallback(() => {
    setFilenameInput('');
    onFiltersChange({ ...DEFAULT_FILTERS });
  }, [onFiltersChange]);

  const ratingLabel = (option) => {
    if (option.value === 'all') return t('view.filter.rating_all');
    if (option.value === '-1') return t('view.filter.rejected');
    if (option.value === '0') return t('view.filter.unrated');
    return option.label;
  };

  const cameraModels = stats?.cameraModelNames || [];
  const fileTypes = stats?.fileTypes || [];
  const directories = stats?.directories || [];
  const fileTypeExtensions = stats?.fileTypeExtensions || [];
  const socialPublishStats = stats?.socialPublishPending || [];
  const socialPublishedStats = stats?.socialPublished || [];

  const handleMultiSelectChange = (key) => (e) => {
    const value = e.target.value;
    onFiltersChange({ ...filters, [key]: typeof value === 'string' ? value.split(',') : value });
  };

  return (
    <Box sx={{ mb: 2, p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
      <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
        {t('view.filter.section')}
      </Typography>
      <Stack spacing={2}>
        {/* Rating filter */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {RATING_OPTIONS.map((opt) => {
            const selected =
              opt.value === 'all'
                ? (filters.ratings || []).length === 0
                : (filters.ratings || []).includes(opt.value);
            return (
              <Chip
                key={opt.value}
                label={ratingLabel(opt)}
                color={selected ? 'primary' : 'default'}
                variant={selected ? 'filled' : 'outlined'}
                onClick={() => {
                  if (opt.value === 'all') {
                    onFiltersChange({ ...filters, ratings: [] });
                  } else {
                    handleRatingToggle(opt.value);
                  }
                }}
                size="small"
              />
            );
          })}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          {/* Date range */}
          <TextField
            label={t('view.filter.date_from')}
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateFrom || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value })}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t('view.filter.date_to')}
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateTo || ''}
            onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value })}
            sx={{ minWidth: 160 }}
          />

          {/* Filename search */}
          <TextField
            label={t('view.filter.filename')}
            size="small"
            value={filenameInput}
            onChange={(e) => setFilenameInput(e.target.value)}
            sx={{ minWidth: 200 }}
          />

          {/* Camera model */}
          {cameraModels.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('view.filter.camera')}</InputLabel>
              <Select
                value={filters.camera || ''}
                label={t('view.filter.camera')}
                onChange={(e) => onFiltersChange({ ...filters, camera: e.target.value })}
              >
                <MenuItem value="">
                  <em>{t('view.filter.rating_all')}</em>
                </MenuItem>
                {cameraModels.map((m) => (
                  <MenuItem key={m} value={m}>
                    {m}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* File type */}
          {fileTypes.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>{t('view.filter.file_type')}</InputLabel>
              <Select
                value={filters.fileType || ''}
                label={t('view.filter.file_type')}
                onChange={(e) => onFiltersChange({ ...filters, fileType: e.target.value })}
              >
                <MenuItem value="">
                  <em>{t('view.filter.rating_all')}</em>
                </MenuItem>
                {fileTypes.map((ft) => (
                  <MenuItem key={ft} value={ft}>
                    {ft}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          {/* Directory */}
          {directories.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('view.filter.directory')}</InputLabel>
              <Select
                value={filters.directory || ''}
                label={t('view.filter.directory')}
                onChange={(e) => onFiltersChange({ ...filters, directory: e.target.value })}
              >
                <MenuItem value="">
                  <em>{t('view.filter.rating_all')}</em>
                </MenuItem>
                {directories.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* File-type extension (multi) */}
          {fileTypeExtensions.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>{t('view.filter.extension')}</InputLabel>
              <Select
                multiple
                value={filters.extension || []}
                onChange={handleMultiSelectChange('extension')}
                input={<OutlinedInput label={t('view.filter.extension')} />}
                renderValue={(selected) => selected.join(', ')}
              >
                {fileTypeExtensions.map((ext) => (
                  <MenuItem key={ext} value={ext}>
                    <Checkbox checked={(filters.extension || []).includes(ext)} />
                    <ListItemText primary={ext} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Social: marked-for-publish (multi, per-service) */}
          {socialPublishStats.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('view.filter.social_publish')}</InputLabel>
              <Select
                multiple
                value={filters.socialPublish || []}
                onChange={handleMultiSelectChange('socialPublish')}
                input={<OutlinedInput label={t('view.filter.social_publish')} />}
                renderValue={(selected) => selected.join(', ')}
              >
                {socialPublishStats.map(({ service, count }) => (
                  <MenuItem key={service} value={service} disabled={count === 0}>
                    <Checkbox checked={(filters.socialPublish || []).includes(service)} />
                    <ListItemText primary={`${service} (${count})`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Social: already-published (multi, per-service) */}
          {socialPublishedStats.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>{t('view.filter.social_published')}</InputLabel>
              <Select
                multiple
                value={filters.socialPublished || []}
                onChange={handleMultiSelectChange('socialPublished')}
                input={<OutlinedInput label={t('view.filter.social_published')} />}
                renderValue={(selected) => selected.join(', ')}
              >
                {socialPublishedStats.map(({ service, count }) => (
                  <MenuItem key={service} value={service} disabled={count === 0}>
                    <Checkbox checked={(filters.socialPublished || []).includes(service)} />
                    <ListItemText primary={`${service} (${count})`} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Stack>

        {/* Reset */}
        <Box>
          <Button
            size="small"
            startIcon={<FilterListOffIcon />}
            onClick={handleReset}
            variant="outlined"
          >
            {t('view.filter.reset')}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

export default FilterBar;
