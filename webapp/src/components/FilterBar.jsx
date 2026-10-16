import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import TuneIcon from '@mui/icons-material/Tune';
import { useLanguage } from '../contexts/LanguageContext';
import PageSection from './PageSection';
import { NONE_VALUE, countActiveFilters } from './view/viewMedia';

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
  date: '',
  dateFrom: '',
  dateTo: '',
  filename: '',
  camera: '',
  fileType: '',
  directory: '',
  extension: [],
  socialPublish: [],
  socialPublished: [],
  varField: '',
  varValue: '',
};

// Keep the current selection in the option list even when the other filters
// reduce its count to zero (otherwise MUI warns about an out-of-range value).
function withSelected(options, selected) {
  if (!selected || options.some((o) => o.value === selected)) return options;
  return [...options, { value: selected, count: 0 }];
}

function FacetSelect({ label, value, options, onChange, renderLabel, minWidth = 180, testId }) {
  const { t } = useLanguage();
  return (
    <FormControl size="small" sx={{ minWidth }} data-testid={testId}>
      <InputLabel>{label}</InputLabel>
      <Select value={value || ''} label={label} onChange={(e) => onChange(e.target.value)}>
        <MenuItem value="">
          <em>{t('view.filter.rating_all')}</em>
        </MenuItem>
        {options.map((o) => (
          <MenuItem key={String(o.value)} value={o.value}>
            {`${renderLabel ? renderLabel(o.value) : o.value} (${o.count})`}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

function FacetMultiSelect({ label, value, options, onChange, renderLabel, minWidth = 180 }) {
  const selected = value || [];
  return (
    <FormControl size="small" sx={{ minWidth }}>
      <InputLabel>{label}</InputLabel>
      <Select
        multiple
        value={selected}
        onChange={(e) => {
          const v = e.target.value;
          onChange(typeof v === 'string' ? v.split(',') : v);
        }}
        input={<OutlinedInput label={label} />}
        renderValue={(sel) => sel.map((s) => (renderLabel ? renderLabel(s) : s)).join(', ')}
      >
        {options.map((o) => (
          <MenuItem key={String(o.value)} value={o.value} disabled={o.count === 0 && !selected.includes(o.value)}>
            <Checkbox checked={selected.includes(o.value)} />
            <ListItemText primary={`${renderLabel ? renderLabel(o.value) : o.value} (${o.count})`} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.filename]);

  const set = useCallback((patch) => onFiltersChange({ ...filters, ...patch }), [filters, onFiltersChange]);

  const handleRatingToggle = useCallback(
    (value) => {
      const current = filters.ratings || [];
      const next = current.includes(value) ? current.filter((r) => r !== value) : [...current, value];
      set({ ratings: next });
    },
    [filters, set]
  );

  const handleReset = useCallback(() => {
    setFilenameInput('');
    onFiltersChange({ ...DEFAULT_FILTERS });
  }, [onFiltersChange]);

  const ratingCounts = useMemo(() => {
    const map = {};
    for (const r of stats?.ratings || []) map[String(r.value)] = r.count;
    return map;
  }, [stats]);
  const ratingTotal = Object.values(ratingCounts).reduce((a, b) => a + b, 0);

  const ratingLabel = (option) => {
    let label;
    if (option.value === 'all') label = t('view.filter.rating_all');
    else if (option.value === '-1') label = t('view.filter.rejected');
    else if (option.value === '0') label = t('view.filter.unrated');
    else label = option.label;
    if (!stats) return label;
    const count = option.value === 'all' ? ratingTotal : ratingCounts[option.value] || 0;
    return `${label} (${count})`;
  };

  const noneLabel = (v) => (v === NONE_VALUE || v === '' ? t('view.filter_extra.none') : v);
  const serviceLabel = (s) => t(`view.social_services.${s}`);
  const toOptions = (list) => (list || []).map((o) => ({ value: o.value, count: o.count }));
  const withNone = (list) => toOptions(list).map((o) => ({ ...o, value: o.value === '' || o.value === null ? NONE_VALUE : String(o.value) }));

  const dates = withSelected(toOptions(stats?.dates), filters.date);
  const cameras = withSelected(withNone(stats?.cameraModelNames), filters.camera);
  const fileTypes = withSelected(toOptions(stats?.fileTypes), filters.fileType);
  const directories = withSelected(toOptions(stats?.directories), filters.directory);
  const extensions = toOptions(stats?.fileTypeExtensions);
  const socialPending = (stats?.socialPublishPending || []).map((s) => ({ value: s.service, count: s.count }));
  const socialPublished = (stats?.socialPublished || []).map((s) => ({ value: s.service, count: s.count }));
  const fields = stats?.fields || [];
  const variableValues = withSelected(withNone(stats?.variableValues), filters.varValue);

  const activeCount = countActiveFilters(filters);

  return (
    <PageSection
      variant="accordion"
      title={t('view.filter.section')}
      localStorageKey="lbb-accordion-view-filter"
      action={
        activeCount > 0 ? (
          <Chip
            size="small"
            color="primary"
            label={t('view.filter_extra.active').replace('{count}', String(activeCount))}
            data-testid="filter-active-count"
          />
        ) : null
      }
      sx={{ mb: 2 }}
    >
      <Stack spacing={2}>
        {/* Rating filter (with counts, view.php:994-1003) */}
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
                    set({ ratings: [] });
                  } else {
                    handleRatingToggle(opt.value);
                  }
                }}
                data-testid={`rating-chip-${opt.value}`}
              />
            );
          })}
        </Stack>

        {/* Dates */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <FacetSelect
            label={t('view.filter_extra.day')}
            value={filters.date}
            options={dates}
            onChange={(v) => set({ date: v })}
            minWidth={170}
            testId="filter-day"
          />
          <TextField
            label={t('view.filter.date_from')}
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateFrom || ''}
            onChange={(e) => set({ dateFrom: e.target.value })}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t('view.filter.date_to')}
            type="date"
            size="small"
            InputLabelProps={{ shrink: true }}
            value={filters.dateTo || ''}
            onChange={(e) => set({ dateTo: e.target.value })}
            sx={{ minWidth: 160 }}
          />
          <TextField
            label={t('view.filter.filename')}
            size="small"
            value={filenameInput}
            onChange={(e) => setFilenameInput(e.target.value)}
            sx={{ minWidth: 200 }}
          />
        </Stack>

        {/* Camera, file type, extension, directory */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <FacetSelect
            label={t('view.filter.camera')}
            value={filters.camera}
            options={cameras}
            renderLabel={noneLabel}
            onChange={(v) => set({ camera: v })}
          />
          <FacetSelect
            label={t('view.filter.file_type')}
            value={filters.fileType}
            options={fileTypes}
            onChange={(v) => set({ fileType: v })}
            minWidth={150}
          />
          <FacetMultiSelect
            label={t('view.filter.extension')}
            value={filters.extension}
            options={extensions}
            onChange={(v) => set({ extension: v })}
          />
          <FacetSelect
            label={t('view.filter.directory')}
            value={filters.directory}
            options={directories}
            // Directories are stored relative to the medium (lib_view.py),
            // shown with a leading slash like view.php:1053 (storage prefix stripped).
            renderLabel={(d) => `/${d}`}
            onChange={(v) => set({ directory: v })}
            minWidth={200}
          />
        </Stack>

        {/* Social publish state */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
          <FacetMultiSelect
            label={t('view.filter.social_publish')}
            value={filters.socialPublish}
            options={socialPending}
            renderLabel={serviceLabel}
            onChange={(v) => set({ socialPublish: v })}
            minWidth={200}
          />
          <FacetMultiSelect
            label={t('view.filter.social_published')}
            value={filters.socialPublished}
            options={socialPublished}
            renderLabel={serviceLabel}
            onChange={(v) => set({ socialPublished: v })}
            minWidth={200}
          />
        </Stack>

        {/* Advanced: any EXIF column (view.php:1088-1119) */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <TuneIcon fontSize="small" />
            {t('view.filter_extra.advanced')}
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap" useFlexGap>
            <FormControl size="small" sx={{ minWidth: 220 }} data-testid="filter-var-field">
              <InputLabel>{t('view.filter_extra.variable')}</InputLabel>
              <Select
                value={fields.includes(filters.varField) ? filters.varField : ''}
                label={t('view.filter_extra.variable')}
                onChange={(e) => set({ varField: e.target.value, varValue: '' })}
              >
                <MenuItem value="">
                  <em>{t('view.filter_extra.none')}</em>
                </MenuItem>
                {fields.map((f) => (
                  <MenuItem key={f} value={f}>
                    {f.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {filters.varField && fields.includes(filters.varField) && (
              <FacetSelect
                label={t('view.filter_extra.variable_value')}
                value={filters.varValue}
                options={variableValues}
                renderLabel={noneLabel}
                onChange={(v) => set({ varValue: v })}
                minWidth={220}
                testId="filter-var-value"
              />
            )}
          </Stack>
        </Box>

        {/* Reset */}
        <Box>
          <Button
            startIcon={<FilterListOffIcon />}
            onClick={handleReset}
            variant="outlined"
            sx={{ minHeight: 44 }}
            disabled={activeCount === 0}
          >
            {t('view.filter.reset')}
          </Button>
        </Box>
      </Stack>
    </PageSection>
  );
}

export default FilterBar;
