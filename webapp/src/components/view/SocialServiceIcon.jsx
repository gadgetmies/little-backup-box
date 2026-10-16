import React, { useId } from 'react';
import { Box } from '@mui/material';

// Service glyphs and the four state backgrounds from scripts/sub-view-icons.php:
//   nothing   grey     — not queued, not published
//   publish   red      — queued for the next backup run (social_publish bit)
//   published green    — already posted (social_published bit)
//   combined  red/green — posted before and queued again
const GLYPHS = {
  mastodon: (
    <g transform="translate(4,4)">
      <path
        d="M11.19 12.195c2.016-.24 3.77-1.475 3.99-2.603.348-1.778.32-4.339.32-4.339 0-3.47-2.286-4.488-2.286-4.488C12.062.238 10.083.017 8.027 0h-.05C5.92.017 3.942.238 2.79.765c0 0-2.285 1.017-2.285 4.488l-.002.662c-.004.64-.007 1.35.011 2.091.083 3.394.626 6.74 3.78 7.57 1.454.383 2.703.463 3.709.408 1.823-.1 2.847-.647 2.847-.647l-.06-1.317s-1.303.41-2.767.36c-1.45-.05-2.98-.156-3.215-1.928a4 4 0 0 1-.033-.496s1.424.346 3.228.428c1.103.05 2.137-.064 3.188-.189zm1.613-2.47H11.13v-4.08c0-.859-.364-1.295-1.091-1.295-.804 0-1.207.517-1.207 1.541v2.233H7.168V5.89c0-1.024-.403-1.541-1.207-1.541-.727 0-1.091.436-1.091 1.296v4.079H3.197V5.522q0-1.288.66-2.046c.456-.505 1.052-.764 1.793-.764.856 0 1.504.328 1.933.983L8 4.39l.417-.695c.429-.655 1.077-.983 1.934-.983.74 0 1.336.259 1.791.764q.662.757.661 2.046z"
        fill="#6364FF"
      />
    </g>
  ),
  telegram: (
    <g transform="translate(4,4)">
      <path
        d="M15.964.686a.5.5 0 0 0-.65-.65L.767 5.855H.766l-.452.18a.5.5 0 0 0-.082.887l.41.26.001.002 4.995 3.178 3.178 4.995.002.002.26.41a.5.5 0 0 0 .886-.083zm-1.833 1.89L6.637 10.07l-.215-.338a.5.5 0 0 0-.154-.154l-.338-.215 7.494-7.494 1.178-.471z"
        fill="#FFFFFF"
        stroke="#229ED9"
        strokeWidth="1.2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  ),
  matrix: (
    <>
      <g stroke="#000" strokeWidth="1.8" fill="none">
        <path d="M4 5 h3 M4 5 v14 M4 19 h3" />
        <path d="M20 5 h-3 M20 5 v14 M20 19 h-3" />
      </g>
      <text x="12" y="12" fontFamily="sans-serif" fontSize="9" textAnchor="middle" dominantBaseline="middle" fill="#000">
        m
      </text>
    </>
  ),
  bluesky: (
    <g transform="translate(4,4)">
      <path
        d="M3.468 1.948C5.303 3.325 7.276 6.118 8 7.616c.725-1.498 2.698-4.29 4.532-5.668C13.855.955 16 .186 16 2.632c0 .489-.28 4.105-.444 4.692-.572 2.04-2.653 2.561-4.504 2.246 3.236.551 4.06 2.375 2.281 4.2-3.376 3.464-4.852-.87-5.23-1.98-.07-.204-.103-.3-.103-.218 0-.081-.033.014-.102.218-.379 1.11-1.855 5.444-5.231 1.98-1.778-1.825-.955-3.65 2.28-4.2-1.85.315-3.932-.205-4.503-2.246C.28 6.737 0 3.12 0 2.632 0 .186 2.145.955 3.468 1.948"
        fill="#5488f0"
      />
    </g>
  ),
};

const BG = {
  nothing: '#dadada',
  publish: '#ff6363',
  published: '#7dfa75',
};

function SocialServiceIcon({ service, state = 'nothing', size = 20, title }) {
  const gradId = `lbb-social-grad-${useId().replace(/:/g, '')}`;
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      sx={{ flexShrink: 0, display: 'block' }}
      role="img"
      aria-label={title}
      data-social-service={service}
      data-social-state={state}
    >
      {title ? <title>{title}</title> : null}
      {state === 'combined' ? (
        <>
          <defs>
            <linearGradient id={gradId} x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7dfa75" />
              <stop offset="50%" stopColor="#7dfa75" />
              <stop offset="50%" stopColor="#ff6363" />
              <stop offset="100%" stopColor="#ff6363" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="20" height="20" rx="3" ry="3" fill={`url(#${gradId})`} />
        </>
      ) : (
        <rect x="2" y="2" width="20" height="20" rx="3" ry="3" fill={BG[state] || BG.nothing} />
      )}
      {GLYPHS[service] || null}
    </Box>
  );
}

export default SocialServiceIcon;
