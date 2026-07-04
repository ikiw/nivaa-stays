import { Box, Button, Card, CardActionArea, Paper, Stack, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ArrowBackRounded from '@mui/icons-material/ArrowBackRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import RestaurantRounded from '@mui/icons-material/RestaurantRounded';
import RouteRounded from '@mui/icons-material/RouteRounded';
import HomeWorkRounded from '@mui/icons-material/HomeWorkRounded';
import VerifiedRounded from '@mui/icons-material/Verified';
import CohortIcon, { COHORT_COLORS, cohortKey } from '../CohortIcon';
import { COHORT_ORDER, blurbFor, coverFor, planFor } from './shared';
import type { Planner } from '../../usePlanner';

const QUICK_IDEAS: { label: string; cohort: string; days: 1 | 2 }[] = [
  { label: 'Family day', cohort: 'Family Day Out', days: 1 },
  { label: 'Couple trip', cohort: 'Couples Getaway', days: 1 },
  { label: 'Auroville', cohort: 'Solo Explorer', days: 2 },
  { label: 'Beach day', cohort: "Bachelors' Trip", days: 1 },
];

const BENEFITS: { icon: SvgIconComponent; title: string; sub: string }[] = [
  { icon: RouteRounded, title: 'Route optimized', sub: 'Less drive, more time' },
  { icon: RestaurantRounded, title: 'Food breaks included', sub: 'Handpicked local spots' },
  { icon: HomeWorkRounded, title: 'Works from your stay location', sub: 'No extra setup needed' },
  { icon: VerifiedRounded, title: 'Local picks, not just touristy', sub: 'Curated by locals' },
];

export default function MobileLanding({ planner, showBackToItinerary = false, onBackToItinerary }: { planner: Planner; showBackToItinerary?: boolean; onBackToItinerary?: () => void }) {
  const { data, loadCurated, switchView } = planner;

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column', gap: 1.1 }}>
      {showBackToItinerary && (
        <Button size="small" startIcon={<ArrowBackRounded />} onClick={onBackToItinerary} sx={{ alignSelf: 'flex-start', px: 0.7, color: 'text.secondary', textTransform: 'none' }}>
          Back to your itinerary
        </Button>
      )}
      <Paper elevation={0} sx={{
        overflow: 'hidden',
        borderRadius: '18px',
        border: '1px solid rgba(255,255,255,0.12)',
        backgroundImage: 'linear-gradient(90deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.62) 48%, rgba(0,0,0,0.10) 100%), url(/images/pondy-hero-faded.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}>
        <Stack spacing={1.05} sx={{ p: 2.1, pt: 2.4 }}>
          <Typography component="h1" sx={{ color: '#fff', fontFamily: '"Playfair Display", serif', fontWeight: 800, fontSize: '2.05rem', lineHeight: 0.98, letterSpacing: '-0.04em', maxWidth: 310 }}>
            Pick your perfect Pondicherry <Box component="span" sx={{ color: '#E6C35A' }}>day</Box>
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.88rem', lineHeight: 1.45, maxWidth: 285 }}>
            Handpicked routes, local favourites & stunning coastal vibes.
          </Typography>
          <Stack direction="row" spacing={0.85} useFlexGap flexWrap="wrap" sx={{ pt: 0.4 }}>
            <Button variant="contained" disableElevation startIcon={<MapRounded />} endIcon={<ArrowForwardRounded />} onClick={() => loadCurated(planFor('Family Day Out', 2))}
              sx={{ minHeight: 42, bgcolor: '#E6C35A', color: '#231A05', fontWeight: 850, borderRadius: '11px', px: 1.6, '&:hover': { bgcolor: '#F1D171' } }}>
              Browse ready-made trips
            </Button>
            <Button variant="outlined" startIcon={<AutoAwesomeRounded />} onClick={() => switchView('places')}
              sx={{ minHeight: 42, color: '#fff', borderColor: 'rgba(255,255,255,0.32)', fontWeight: 800, borderRadius: '11px', px: 1.45, bgcolor: 'rgba(0,0,0,0.25)' }}>
              Create my itinerary
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap">
        {QUICK_IDEAS.map(({ label, cohort, days }) => {
          const color = COHORT_COLORS[cohortKey(cohort)];
          return (
            <Box key={label} role="button" tabIndex={0} onClick={() => loadCurated(planFor(cohort, days))}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadCurated(planFor(cohort, days)); } }}
              sx={{ height: 37, px: 1.05, borderRadius: '10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.55,
                background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))', color: 'rgba(255,255,255,0.86)', border: '1px solid rgba(255,255,255,0.12)',
                fontSize: '0.82rem', fontWeight: 750 }}>
              <Box sx={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color }}>
                <CohortIcon cohort={cohort} size={17} />
              </Box>
              {label}
            </Box>
          );
        })}
      </Stack>

      <Paper elevation={0} sx={{ p: 1.15, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.10)', background: 'linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.028))' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Stack direction="row" spacing={0.65} alignItems="center">
            <Box sx={{ color: '#E6C35A', fontSize: 18 }}>★</Box>
            <Typography sx={{ color: '#fff', fontWeight: 850, fontSize: '1rem' }}>Popular ready-made itineraries</Typography>
          </Stack>
          <Button size="small" endIcon={<ChevronRightRounded sx={{ fontSize: 16 }} />} onClick={() => switchView('places')}
            sx={{ color: '#E6C35A', textTransform: 'none', fontWeight: 800, minWidth: 0, px: 0.5 }}>View all</Button>
        </Stack>

        <Stack spacing={0.85}>
          {COHORT_ORDER.map(cohort => {
            const c = planFor(cohort, 1);
            const color = COHORT_COLORS[cohortKey(cohort)];
            const stopCount = c.plan.reduce((n, d) => n + d.length, 0);
            const img = coverFor(cohort, data, c);
            return (
              <Card key={cohort} variant="outlined" sx={{ borderRadius: '15px', overflow: 'hidden', borderColor: 'rgba(255,255,255,0.10)', bgcolor: 'rgba(255,255,255,0.045)' }}>
                <CardActionArea onClick={() => loadCurated(c)} sx={{ display: 'grid', gridTemplateColumns: '42% minmax(0, 1fr) 28px', minHeight: 108 }}>
                  <Box sx={{ height: '100%', overflow: 'hidden', bgcolor: color + '18' }}>
                    {img && <Box component="img" src={img} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </Box>
                  <Box sx={{ minWidth: 0, p: 1.2, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0.45 }}>
                    <Stack direction="row" spacing={0.6} alignItems="center">
                      <Box sx={{ color, display: 'flex' }}><CohortIcon cohort={cohort} size={16} /></Box>
                      <Typography sx={{ color: '#fff', fontWeight: 850, fontSize: '0.98rem', lineHeight: 1.15 }}>{cohort}</Typography>
                    </Stack>
                    <Typography sx={{ color: 'rgba(255,255,255,0.66)', fontSize: '0.78rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{blurbFor(cohort, c)}</Typography>
                    <Stack direction="row" spacing={0.55} alignItems="center" sx={{ color: 'rgba(255,255,255,0.64)', fontSize: '0.76rem' }}>
                      <span>◷ 1 day</span>
                      <span>|</span>
                      <PlaceRounded sx={{ fontSize: 13 }} />
                      <span>{stopCount} stops</span>
                    </Stack>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E6C35A' }}>
                    <ChevronRightRounded />
                  </Box>
                </CardActionArea>
              </Card>
            );
          })}
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p: 1, borderRadius: '16px', border: '1px solid rgba(255,255,255,0.10)', background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.035))' }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 0.7 }}>
          {BENEFITS.slice(0, 3).map(({ icon: Icon, title, sub }) => (
            <Stack key={title} spacing={0.45} alignItems="center" sx={{ textAlign: 'center' }}>
              <Box sx={{ width: 31, height: 31, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(230,195,90,0.34)', color: '#E6C35A', bgcolor: 'rgba(230,195,90,0.08)' }}><Icon sx={{ fontSize: 16 }} /></Box>
              <Typography sx={{ color: '#fff', fontSize: '0.72rem', fontWeight: 800, lineHeight: 1.15 }}>{title}</Typography>
              <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.64rem', lineHeight: 1.2 }}>{sub}</Typography>
            </Stack>
          ))}
        </Box>
      </Paper>
    </Box>
  );
}
