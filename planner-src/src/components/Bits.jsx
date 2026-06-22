// Small shared presentational bits used across the planner's panels.
import { Box, Stack, Typography } from '@mui/material';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { CAT_ICON, CAT_LABEL } from '../constants';

/**
 * Compact connected day-glance row (used in the on-map floating card) — a dot + a
 * leg-coloured line down to the next dot, with the drive label on the connector.
 * @param {{ color:string, dot:string|number, name:string, time:string, legColor?:string, drive?:string, last?:boolean }} props
 */
export function GlanceRow({ color, dot, name, time, legColor, drive, last }) {
  return (
    <Stack direction="row" spacing={1} alignItems="stretch">
      <Box sx={{ width: 20, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, bgcolor: color, color: '#0B1020', fontSize: '0.68rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dot}</Box>
        {!last && <Box sx={{ flex: 1, width: 2.5, bgcolor: legColor || 'divider', borderRadius: 2, mt: 0.3, minHeight: 14 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, pb: last ? 0.4 : 0.8 }}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.1 }}>
          <Typography sx={{ flex: 1, minWidth: 0, fontSize: '0.82rem', fontWeight: 600, color: 'text.primary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</Typography>
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', flexShrink: 0 }}>{time}</Typography>
        </Stack>
        {!last && drive && (
          <Box sx={{ mt: 0.3, fontSize: '0.7rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.4 }}>
            <DirectionsCarRounded sx={{ fontSize: 13, color: legColor || 'inherit' }} />{drive}
          </Box>
        )}
      </Box>
    </Stack>
  );
}

/** Full-height centred wrapper for loading / error / empty states. */
export function Centered({ children }) { return <Box sx={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4, textAlign: 'center' }}>{children}</Box>; }

/** Single-column grid used by the picker lists. */
export function Grid({ children }) { return <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 1 }}>{children}</Box>; }

/**
 * Collapsible category section header in the place picker.
 * @param {{ cat:string, count:number, collapsed:boolean, onToggle:()=>void }} props
 */
export function CatHead({ cat, count, collapsed, onToggle }) {
  const Icon = CAT_ICON[cat];
  return (
    <Box onClick={onToggle} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle?.(); } }}
      sx={{ display: 'flex', alignItems: 'center', gap: 0.6, py: 0.5, cursor: 'pointer', userSelect: 'none', color: 'text.secondary', '&:hover': { color: 'text.primary' } }}>
      <Icon sx={{ fontSize: 15, flexShrink: 0 }} />
      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>{CAT_LABEL[cat]}</Typography>
      <Typography component="span" sx={{ fontSize: '0.72rem', fontWeight: 700 }}>{count}</Typography>
      <ExpandMoreRounded sx={{ fontSize: 18, transition: 'transform .2s ease', transform: collapsed ? 'rotate(-90deg)' : 'none' }} />
    </Box>
  );
}
