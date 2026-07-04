import { Box, Button, Card, CardActionArea, Paper, Stack, Typography } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import AccessTimeRounded from '@mui/icons-material/AccessTimeRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import BookmarkBorderRounded from '@mui/icons-material/BookmarkBorderRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import CohortIcon, { COHORT_COLORS, cohortKey } from '../CohortIcon';
import { COHORT_ORDER, blurbFor, coverFor, planFor } from './shared';
import type { Planner } from '../../usePlanner';
import { ACCENT, accentHoverBorder, accentSoftBg, cardBg, hoverBg, mutedColor, panelBg, panelBorder, shadowSoft, titleColor } from '../../theme/surfaces';

export default function ItinerariesPanel({ planner }: { planner: Planner }) {
  const { data, loadCurated, switchView } = planner;
  return (
    <Paper id="ready-made-trips" elevation={0} sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', p: { md: 1.15, xl: 1.25 }, borderRadius: '18px',
      border: `1px solid ${panelBorder}`, background: panelBg, boxShadow: shadowSoft }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1.5} sx={{ mb: 1 }}>
        <Stack direction="row" spacing={0.8} alignItems="center">
          <StarRounded sx={{ color: ACCENT, fontSize: 20 }} />
          <Typography sx={{ color: titleColor, fontWeight: 850, fontSize: '1.05rem' }}>Popular ready-made itineraries</Typography>
        </Stack>
        <Button size="small" endIcon={<ArrowForwardRounded sx={{ fontSize: 15 }} />} onClick={() => switchView('places')}
          sx={{ textTransform: 'none', fontWeight: 800, color: ACCENT, borderRadius: '9px', px: 1, '&:hover': { bgcolor: accentSoftBg } }}>
          View all trips
        </Button>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: { md: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(4, minmax(0, 1fr))' }, gap: 1.1 }}>
        {COHORT_ORDER.map(cohort => {
          const c = planFor(cohort, 2);
          const color = COHORT_COLORS[cohortKey(cohort)];
          const stopCount = c.plan.reduce((n, d) => n + d.length, 0);
          const img = coverFor(cohort, data, c);
          return (
            <Card key={cohort} variant="outlined" sx={{ height: '100%', borderRadius: '17px', overflow: 'hidden', borderColor: panelBorder, background: cardBg, boxShadow: shadowSoft, transition: 'border-color .16s, background-color .16s, transform .16s', '&:hover': { transform: 'translateY(-2px)', borderColor: accentHoverBorder, bgcolor: hoverBg } }}>
              <CardActionArea onClick={() => loadCurated(c)} sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
                <Box sx={{ position: 'relative', flex: '0 0 auto', height: { md: 106, xl: 116 }, bgcolor: color + '18' }}>
                  {img && <Box component="img" src={img} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.00) 36%, rgba(0,0,0,0.50) 100%)' }} />
                  <Box sx={{ position: 'absolute', top: 8, right: 8, width: 27, height: 27, borderRadius: '50%', bgcolor: 'rgba(0,0,0,0.48)', border: '1px solid rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BookmarkBorderRounded sx={{ fontSize: 15, color: '#fff' }} />
                  </Box>
                </Box>
                <Box sx={{ flex: 1, minHeight: 0, p: 1.4, pt: 1.15, display: 'flex', flexDirection: 'column', gap: 0.62 }}>
                  <Stack direction="row" spacing={0.7} alignItems="center">
                    <Box sx={{ color, display: 'flex', opacity: 0.95 }}><CohortIcon cohort={cohort} size={17} /></Box>
                    <Typography sx={{ color: titleColor, fontWeight: 850, fontSize: '0.96rem', lineHeight: 1.18 }}>{cohort}</Typography>
                  </Stack>
                  <Typography sx={{ color: mutedColor, fontSize: '0.73rem', lineHeight: 1.42, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{blurbFor(cohort, c)}</Typography>
                  <Stack direction="row" spacing={0.58} alignItems="center" sx={{ color: mutedColor, fontSize: '0.72rem', pt: 0.1 }}>
                    <AccessTimeRounded sx={{ fontSize: 13 }} />
                    <span>2 days</span>
                    <PlaceRounded sx={{ fontSize: 13, ml: 0.4 }} />
                    <span>{stopCount} stops</span>
                  </Stack>
                  <Box sx={{ mt: 'auto', py: 0.72, borderRadius: '10px', border: `1px solid ${accentHoverBorder}`, color: ACCENT, fontSize: '0.78rem', fontWeight: 850, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.3, bgcolor: accentSoftBg }}>
                    View plan <ChevronRightRounded sx={{ fontSize: 16 }} />
                  </Box>
                </Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Paper>
  );
}
