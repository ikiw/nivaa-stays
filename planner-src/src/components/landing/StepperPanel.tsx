import { Box, Paper, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import { ACCENT, accentBorder, mutedColor, panelBg, panelBorder, shadowSoft, softDivider, titleColor } from '../../theme/surfaces';

const STEPS: { n: string; icon: SvgIconComponent; title: string; sub: string }[] = [
  { n: '1', icon: AutoAwesomeRounded, title: 'Pick a trip', sub: 'Choose a ready-made plan' },
  { n: '2', icon: AccessTimeRounded, title: 'Set time & start point', sub: 'We tailor it to your location' },
  { n: '3', icon: MapRounded, title: 'Get route + map', sub: 'Places, food & timings ready' },
];

export default function StepperPanel() {
  return (
    <Paper elevation={0} sx={{ flexShrink: 0, minHeight: 76, display: 'flex', alignItems: 'center', p: 1, borderRadius: '16px', border: `1px solid ${panelBorder}`, background: panelBg, boxShadow: shadowSoft }}>
      <Stack direction="row" alignItems="center" sx={{ width: '100%' }}>
        {STEPS.map(({ n, icon: Icon, title, sub }, i) => (
          <Box key={n} sx={{ display: 'contents' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 1.1, flexShrink: 0 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${accentBorder}`, boxShadow: `0 0 0 4px ${ACCENT}14`, color: ACCENT, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '0.88rem', flexShrink: 0 }}>{n}</Box>
              <Icon sx={{ fontSize: 19, color: ACCENT, flexShrink: 0 }} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ color: titleColor, fontSize: '0.82rem', fontWeight: 850, lineHeight: 1.2 }}>{title}</Typography>
                <Typography sx={{ color: mutedColor, fontSize: '0.7rem', lineHeight: 1.25 }}>{sub}</Typography>
              </Box>
            </Stack>
            {i < STEPS.length - 1 && <Box sx={{ flex: 1, minWidth: 24, height: 0, borderTop: `1.5px dashed ${softDivider}`, mx: 0.5 }} />}
          </Box>
        ))}
      </Stack>
    </Paper>
  );
}
