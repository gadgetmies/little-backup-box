import React, { useState } from 'react';
import { Box, Button, Collapse, Table, TableBody, TableCell, TableRow } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import { useLanguage } from '../../contexts/LanguageContext';
import { EXIF_FIELDS_BLOCKED, formatCreateDate } from '../../utils/viewMediaKinds';

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === '';

function keyRows(image, t) {
  const dateFmt = t('view.date_format');
  const pattern = dateFmt && dateFmt !== 'view.date_format' ? dateFmt : 'Y-m-d';
  const make = image.Make ? String(image.Make) : '';
  const model = image.Camera_Model_Name ? String(image.Camera_Model_Name) : '';
  const camera = model && make && model.toLowerCase().startsWith(make.toLowerCase()) ? model : [make, model].filter(Boolean).join(' ');
  const exposure = [
    image.Exposure_Time ? `${image.Exposure_Time} s` : '',
    image.F_Number ? `f/${image.F_Number}` : '',
    image.ISO ? `ISO ${image.ISO}` : '',
    image.Focal_Length || '',
  ]
    .filter(Boolean)
    .join(' · ');
  return [
    { key: 'taken', label: t('view.single.info_taken'), value: image.Create_Date ? formatCreateDate(image.Create_Date, `${pattern} H:i:s`) : '' },
    { key: 'camera', label: t('view.single.info_camera'), value: camera },
    { key: 'lens', label: t('view.single.info_lens'), value: image.Lens_Model || image.Lens_ID || image.Lens || '' },
    { key: 'exposure', label: t('view.single.info_exposure'), value: exposure },
    { key: 'duration', label: t('view.single.info_duration'), value: image.Duration || '' },
    { key: 'folder', label: t('view.single.info_folder'), value: image.Directory ? `/${image.Directory}` : '' },
    { key: 'size', label: t('view.single.info_size'), value: [image.File_Size, image.Image_Size].filter(Boolean).join(' · ') },
  ].filter((r) => !isEmpty(r.value));
}

const cellSx = { wordBreak: 'break-word', verticalAlign: 'top', px: 1, py: 0.75 };

/**
 * "File info": a few key EXIF rows, then every non-empty EXIF_DATA column
 * except ID and ExifTool_Version_Number (view.php:1376-1387) on demand.
 */
function FileInfo({ image }) {
  const { t } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  if (!image) return null;

  const rows = keyRows(image, t);
  const allFields = Object.entries(image).filter(([field, value]) => !isEmpty(value) && !EXIF_FIELDS_BLOCKED.includes(field));

  return (
    <Box>
      <Table size="small" aria-label={t('view.single.info_title')} data-testid="file-info-key">
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.key}>
              <TableCell component="th" scope="row" sx={{ ...cellSx, width: '35%', color: 'text.secondary' }}>
                {r.label}
              </TableCell>
              <TableCell sx={cellSx}>{r.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Button
        onClick={() => setShowAll((v) => !v)}
        endIcon={showAll ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        aria-expanded={showAll}
        sx={{ mt: 1, minHeight: 44 }}
        data-testid="show-all-fields"
      >
        {(showAll ? t('view.single.hide_all_fields') : t('view.single.show_all_fields')).replace('{count}', String(allFields.length))}
      </Button>
      <Collapse in={showAll} unmountOnExit>
        <Table size="small" data-testid="file-info-all">
          <TableBody>
            {allFields.map(([field, value]) => (
              <TableRow key={field}>
                <TableCell component="th" scope="row" sx={{ ...cellSx, width: '40%', color: 'text.secondary' }}>
                  {field.replace(/_/g, ' ')}
                </TableCell>
                <TableCell sx={{ ...cellSx, fontWeight: 500 }}>{String(value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Collapse>
    </Box>
  );
}

export default FileInfo;
