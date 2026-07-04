import { Box, Paper, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import RouteRounded from '@mui/icons-material/RouteRounded';
import RestaurantRounded from '@mui/icons-material/RestaurantRounded';
import HomeWorkRounded from '@mui/icons-material/HomeWorkRounded';
import VerifiedRounded from '@mui/icons-material/Verified';

const BENEFITS: { icon: SvgIconComponent; title: string; sub: string }[] = [
  { icon: RouteRounded, title: 'Route optimized', sub: 'Less drive, more time' },
  { icon: RestaurantRounded, title: 'Food breaks included', sub: 'Handpicked local spots' },
  { icon: HomeWorkRounded, title: 'Works from your stay location', sub: 'No extra setup needed' },
  { icon: VerifiedRounded, title: 'Local picks, not just touristy', sub: 'Curated by Pondicherry locals' },
];

export default function InfoPanel() {
  return (
    <Paper elevation={0} sx={{ flexShrink: 0, minHeight: 68, display: 'flex', alignItems: 'center', p: 0.9, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.10)', background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.035))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
      <Box sx={{ width: '100%', display: 'grid', gridTemplateColumns: { md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' } }}>
        {BENEFITS.map(({ icon: Icon, title, sub }, i) => (
          <Stack key={title} direction="row" spacing={1} alignItems="center" sx={{ px: 1.15, py: 0.25, borderLeft: i === 0 ? 'none' : { lg: '1px solid rgba(255,255,255,0.08)' } }}>
            <Box sx={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(230,195,90,0.38)', background: 'radial-gradient(circle at 35% 20%, rgba(230,195,90,0.22), rgba(230,195,90,0.06))', color: '#E6C35A' }}>
              <Icon sx={{ fontSize: 16 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ color: '#fff', fontSize: '0.75rem', fontWeight: 800, lineHeight: 1.15 }}>{title}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.68rem', lineHeight: 1.2 }}>{sub}</Typography>
            </Box>
          </Stack>
        ))}
      </Box>
    </Paper>
  );
}
