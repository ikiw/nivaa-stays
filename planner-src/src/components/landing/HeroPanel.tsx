import { Box, Button, Paper, Stack, Typography } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import CohortIcon, { COHORT_COLORS, cohortKey } from '../CohortIcon';
import { HERO_IMAGE, planFor } from './shared';
import type { Planner } from '../../usePlanner';

const QUICK_IDEAS: { label: string; cohort: string; days: 1 | 2 }[] = [
  { label: 'Family day', cohort: 'Family Day Out', days: 1 },
  { label: 'Couple trip', cohort: 'Couples Getaway', days: 1 },
  { label: 'Auroville', cohort: 'Solo Explorer', days: 2 },
  { label: 'Beach day', cohort: "Bachelors' Trip", days: 1 },
];

const PREVIEWS = [
  { title: 'Family Day Out', meta: '10 places · 1 day', cohort: 'Family Day Out', img: '/images/itinerary-solo-explorer.jpg' },
  { title: 'White Town + Promenade + Café', meta: '8 places · ~7 hrs', cohort: 'Couples Getaway', img: '/images/itinerary-couples-getaway.jpg' },
  { title: 'Auroville + Serenity Beach', meta: '7 places · ~6.5 hrs', cohort: 'Solo Explorer', img: '/images/places/matrimandir-auroville.avif' },
  { title: 'Surf, beaches & nightlife', meta: '8 places · 1 day', cohort: "Bachelors' Trip", img: '/images/itinerary-bachelors-trip.jpg' },
];

export default function HeroPanel({ planner }: { planner: Planner }) {
  const { loadCurated, switchView } = planner;

  return (
    <Paper elevation={0} sx={{ position: 'relative', flexShrink: 0, overflow: 'hidden', borderRadius: '18px',
      border: '1px solid rgba(255,255,255,0.12)', bgcolor: '#000',
      backgroundImage: 'url(' + HERO_IMAGE + ')', backgroundSize: 'cover', backgroundPosition: 'center',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { md: '520px minmax(0, 1fr)' }, alignItems: 'stretch', height: { md: 306, xl: 326 } }}>
        <Stack spacing={1.15} justifyContent="center" sx={{ pl: { md: 4.6, xl: 5.2 }, pr: { md: 1.5, xl: 2 }, py: { md: 2.1, xl: 2.4 }, maxWidth: 520 }}>
          <Typography component="h1" sx={{ color: '#fff', fontFamily: '"Playfair Display", serif', fontSize: { md: '2.38rem', xl: '2.78rem' }, fontWeight: 800, letterSpacing: '-0.045em', lineHeight: 0.94, textShadow: '0 3px 22px rgba(0,0,0,0.65)' }}>
            Pick your perfect<br />
            Pondicherry <Box component="span" sx={{ color: '#E6C35A' }}>day</Box>
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.78)', fontSize: '0.9rem', lineHeight: 1.38, textShadow: '0 1px 8px rgba(0,0,0,0.5)' }}>
            Handpicked routes, local favourites & stunning coastal vibes.
          </Typography>
          <Stack direction="row" spacing={1.1} useFlexGap flexWrap="wrap" sx={{ pt: 0.25 }}>
            <Button variant="contained" disableElevation startIcon={<MapRounded />} endIcon={<ArrowForwardRounded />} onClick={() => loadCurated(planFor('Family Day Out', 2))}
              sx={{ minHeight: 42, minWidth: 224, background: 'linear-gradient(180deg, #F2CF64 0%, #DFAE32 100%)', color: '#231A05', fontWeight: 850, borderRadius: '11px', px: 2.2, boxShadow: '0 8px 22px rgba(230,195,90,0.16), inset 0 1px 0 rgba(255,255,255,0.32)', '&:hover': { background: 'linear-gradient(180deg, #F7D97C 0%, #E7B943 100%)' } }}>
              Browse ready-made trips
            </Button>
            <Button variant="outlined" startIcon={<AutoAwesomeRounded />} onClick={() => switchView('places')}
              sx={{ minHeight: 42, minWidth: 176, color: '#fff', borderColor: 'rgba(255,255,255,0.28)', fontWeight: 800, borderRadius: '11px', px: 2, background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))', backdropFilter: 'blur(8px)', '&:hover': { borderColor: 'rgba(230,195,90,0.5)', bgcolor: 'rgba(11,14,21,0.55)' } }}>
              Create my itinerary
            </Button>
          </Stack>
          <Stack direction="row" spacing={0.75} useFlexGap flexWrap="wrap" sx={{ pt: 0.15 }}>
            {QUICK_IDEAS.map(({ label, cohort, days }) => {
              const color = COHORT_COLORS[cohortKey(cohort)];
              return (
                <Box key={label} role="button" tabIndex={0} onClick={() => loadCurated(planFor(cohort, days))}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); loadCurated(planFor(cohort, days)); } }}
                  sx={{ height: 28, px: 0.75, borderRadius: '9px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 0.45,
                    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.035))', color: 'rgba(255,255,255,0.86)', border: '1px solid rgba(255,255,255,0.13)',
                    fontSize: '0.72rem', fontWeight: 750, transition: 'background-color .12s, border-color .12s, transform .12s',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.10)', borderColor: `${color}66`, transform: 'translateY(-1px)' } }}>
                  <Box sx={{ width: 17, height: 17, borderRadius: '6px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${color}18`, color }}>
                    <CohortIcon cohort={cohort} size={13} />
                  </Box>
                  {label}
                </Box>
              );
            })}
          </Stack>
        </Stack>

        <Box sx={{ position: 'relative', alignSelf: 'stretch', overflow: 'hidden' }}>
          {/* Background and black fade are baked into HERO_IMAGE; overlays here are only route UI. */}
          {/* faint route line + pins over the image */}
          <Box sx={{ position: 'absolute', left: '6%', top: '26%', width: '46%', height: '46%', borderLeft: '2px dashed rgba(230,195,90,0.5)', borderBottom: '2px dashed rgba(230,195,90,0.32)', borderRadius: '0 0 0 60%', transform: 'rotate(-8deg)', pointerEvents: 'none' }} />
          {[['9%', '24%'], ['30%', '58%']].map(([left, top], i) => (
            <PlaceRounded key={i} sx={{ position: 'absolute', left, top, color: '#E6C35A', fontSize: 20, filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.7))', pointerEvents: 'none' }} />
          ))}
          <Stack spacing={0.58} sx={{ position: 'absolute', top: '50%', right: 14, transform: 'translateY(-50%)', width: { md: 318, xl: 332 } }}>
            <Typography sx={{ alignSelf: 'flex-end', px: 0.9, py: 0.32, borderRadius: 999, bgcolor: 'rgba(10,12,18,0.72)', border: '1px solid rgba(230,195,90,0.28)', color: '#F4D77A', fontSize: '0.64rem', fontWeight: 850, textTransform: 'uppercase', letterSpacing: '0.06em', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)' }}>
              Quick 1-day plans
            </Typography>
            {PREVIEWS.map((p) => (
              <Paper key={p.title} elevation={0} onClick={() => loadCurated(planFor(p.cohort, 1))}
                sx={{ overflow: 'hidden', display: 'grid', gridTemplateColumns: '76px minmax(0, 1fr) 36px', alignItems: 'stretch', minHeight: 62, borderRadius: '18px', cursor: 'pointer',
                  border: '1.25px solid rgba(230,195,90,0.28)',
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.13), rgba(17,19,25,0.34) 40%, rgba(6,8,13,0.22))',
                  backdropFilter: 'blur(24px) saturate(1.28)',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(230,195,90,0.08)',
                  transition: 'transform .12s, border-color .12s, background-color .12s',
                  '&:hover': { transform: 'translateY(-1px)', borderColor: 'rgba(230,195,90,0.50)', background: 'linear-gradient(135deg, rgba(255,255,255,0.17), rgba(17,19,25,0.40) 40%, rgba(6,8,13,0.28))' } }}>
                <Box sx={{ minWidth: 0, height: '100%', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.06)', borderRight: '1px solid rgba(230,195,90,0.14)' }}>
                  <Box component="img" src={p.img} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </Box>
                <Box sx={{ minWidth: 0, px: 1.18, py: 0.78, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography sx={{ color: '#fff', fontSize: '0.84rem', lineHeight: 1.17, fontWeight: 850, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', letterSpacing: '-0.01em' }}>{p.title}</Typography>
                  <Stack direction="row" spacing={0.35} alignItems="center" sx={{ mt: 0.34, color: 'rgba(255,255,255,0.70)', fontSize: '0.68rem' }}>
                    <PlaceRounded sx={{ fontSize: 11.5 }} />
                    <span>{p.meta}</span>
                  </Stack>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#E6C35A', pr: 0.65 }}>
                  <ChevronRightRounded sx={{ fontSize: 22 }} />
                </Box>
              </Paper>
            ))}
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}
