import React from 'react';
import { Box, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import StarIcon from '@mui/icons-material/Star';
import StarBorderIcon from '@mui/icons-material/StarBorder';

/**
 * Pure controlled rating widget.
 *
 * Props:
 *   value    {number}  Current rating: -1 = rejected, 0 = unrated, 1-5 = star rating
 *   onChange {Function} Called with the new rating value
 *   disabled {boolean}  When true, no interactions, visually muted
 *   size     {'small'|'normal'} Controls icon size
 */
function RatingWidget({ value = 0, onChange, disabled = false, size = 'normal' }) {
  const iconFontSize = size === 'small' ? 'small' : 'medium';

  const handleReject = () => {
    if (disabled || !onChange) return;
    onChange(-1);
  };

  const handleStar = (star) => {
    if (disabled || !onChange) return;
    // Toggle: clicking the active star unrates the image
    if (value === star) {
      onChange(0);
    } else {
      onChange(star);
    }
  };

  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.25,
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
      aria-label="rating widget"
    >
      {/* Reject button */}
      <IconButton
        size={iconFontSize}
        onClick={handleReject}
        disabled={disabled}
        aria-label="reject"
        sx={{
          color: value === -1 ? 'error.main' : 'action.active',
          padding: size === 'small' ? '2px' : '4px',
        }}
      >
        <CloseIcon fontSize={iconFontSize} />
      </IconButton>

      {/* Star buttons 1-5 */}
      {[1, 2, 3, 4, 5].map((star) => (
        <IconButton
          key={star}
          size={iconFontSize}
          onClick={() => handleStar(star)}
          disabled={disabled}
          aria-label={`rate ${star} star${star !== 1 ? 's' : ''}`}
          sx={{
            color: value >= star ? 'warning.main' : 'action.active',
            padding: size === 'small' ? '2px' : '4px',
          }}
        >
          {value >= star ? (
            <StarIcon fontSize={iconFontSize} />
          ) : (
            <StarBorderIcon fontSize={iconFontSize} />
          )}
        </IconButton>
      ))}
    </Box>
  );
}

export default RatingWidget;
