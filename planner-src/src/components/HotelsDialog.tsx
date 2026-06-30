// "Where to stay" overlay — a browse-only hotel directory, separate from the itinerary.
// Opened from the top-bar Stays button; lazily fetches data/pondicherry-hotels.json (so it
// costs nothing until opened). One pool of hotels per cohort; the three tiers are derived
// here — Top rated = best by a review-weighted score, Under ₹6k / ₹3k = the same, price-capped.
import { useState, useEffect, useMemo } from 'react';
import { Dialog, AppBar, Toolbar, Box, Typography, IconButton, Tabs, Tab, ToggleButtonGroup, ToggleButton, Stack, Chip, Button, CircularProgress } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import HotelRounded from '@mui/icons-material/HotelRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import LaunchRounded from '@mui/icons-material/LaunchRounded';
import { track } from '../utils';

interface Hotel {
  name: string; slug: string; cohorts: string[]; featured?: boolean; nightlyFrom: number; area: string;
  placeId: string; rating: number | null; reviews: number | null; priceLevel?: string;
  mapsUrl: string; img: string; imgBy: string;
}

const COHORTS = [
  { key: 'family', label: 'Family' },
  { key: 'couples', label: 'Couples' },
  { key: 'bachelors', label: 'Bachelors' },
  { key: 'solo', label: 'Solo' },
  { key: 'jipmer', label: 'Near JIPMER' },
];
const TIERS = [
  { key: 'top', label: 'Top rated', cap: Infinity },
  { key: 'k6', label: 'Under ₹6k', cap: 6000 },
  { key: 'k3', label: 'Under ₹3k', cap: 3000 },
];

// Bayesian shrinkage toward 4.0 so a 5.0 with 26 reviews can't outrank a 4.6 with 2,000.
const PRIOR_N = 50, PRIOR_M = 4.0;
const score = (h: Hotel) => ((h.reviews || 0) * (h.rating || 0) + PRIOR_N * PRIOR_M) / ((h.reviews || 0) + PRIOR_N);
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');

function HotelCard({ h }: { h: Hotel }) {
  const isNivaa = h.featured;
  const bookHref = isNivaa ? 'https://nivaastays.com/booking' : h.mapsUrl;
  return (
    <Box sx={{ display: 'flex', gap: 1.25, p: 1.25, borderRadius: '14px', border: '1px solid', borderColor: isNivaa ? 'primary.main' : 'divider', bgcolor: isNivaa ? 'action.hover' : 'background.paper' }}>
      <Box sx={{ width: 84, height: 84, borderRadius: '10px', flexShrink: 0, overflow: 'hidden', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
        {h.img
          ? <Box component="img" src={h.img} alt={h.name} loading="lazy" decoding="async" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <HotelRounded sx={{ fontSize: 30 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.6} sx={{ flexWrap: 'wrap', rowGap: 0.2 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'text.primary', lineHeight: 1.2 }}>{h.name}</Typography>
          {isNivaa && <Chip label="Our stay" size="small" color="primary" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700 }} />}
        </Stack>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.3, flexWrap: 'wrap', rowGap: 0.2 }}>
          {h.rating != null && (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
              <StarRounded sx={{ fontSize: 14, color: '#FBBF24' }} />
              <Box component="span" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary' }}>{h.rating}</Box>
              {h.reviews != null && <Box component="span" sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>({h.reviews.toLocaleString('en-IN')})</Box>}
            </Box>
          )}
          <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.74rem' }}>·</Box>
          <Chip label={'from ' + inr(h.nightlyFrom)} size="small" variant="outlined" sx={{ height: 19, fontSize: '0.68rem', fontWeight: 700, borderColor: 'divider' }} />
        </Stack>
        <Typography sx={{ mt: 0.3, fontSize: '0.74rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.4, minWidth: 0 }}>
          <PlaceRounded sx={{ fontSize: 13, flexShrink: 0 }} />
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.area}</Box>
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.6 }}>
          <Button size="small" variant={isNivaa ? 'contained' : 'outlined'} disableElevation
            endIcon={isNivaa ? <LaunchRounded sx={{ fontSize: 14 }} /> : <OpenInNewRounded sx={{ fontSize: 14 }} />}
            component="a" href={bookHref} target="_blank" rel="noopener"
            onClick={() => track('hotel_click', { name: h.name, action: isNivaa ? 'book' : 'maps' })}
            sx={{ px: 1, py: 0.2, fontSize: '0.72rem', fontWeight: 700 }}>
            {isNivaa ? 'Book direct' : 'Google Maps'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

interface HotelsDialogProps {
  open: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export default function HotelsDialog({ open, onClose, isMobile }: HotelsDialogProps) {
  const [hotels, setHotels] = useState<Hotel[] | null>(null);
  const [err, setErr] = useState(false);
  const [cohort, setCohort] = useState('family');
  const [tier, setTier] = useState('top');

  useEffect(() => {
    if (!open || hotels) return;
    fetch('/data/pondicherry-hotels.json')
      .then((r) => { if (!r.ok) throw new Error('hotels'); return r.json(); })
      .then((d) => setHotels(d.hotels || []))
      .catch(() => setErr(true));
  }, [open, hotels]);

  useEffect(() => { if (open) track('hotels_open', {}); }, [open]);

  const list = useMemo(() => {
    if (!hotels) return [];
    const cap = TIERS.find((t) => t.key === tier)!.cap;
    const seen = new Set<string>();
    return hotels
      .filter((h) => h.cohorts.includes(cohort) && h.rating != null && h.nightlyFrom <= cap)
      .filter((h) => (seen.has(h.placeId) ? false : (seen.add(h.placeId), true)))
      .sort((a, b) => (a.featured && !b.featured ? -1 : b.featured && !a.featured ? 1 : score(b) - score(a)))
      .slice(0, 5);
  }, [hotels, cohort, tier]);

  return (
    <Dialog fullScreen={isMobile} open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : '16px', backgroundImage: 'none', bgcolor: 'background.default', height: isMobile ? '100%' : '88vh' } }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <HotelRounded sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography sx={{ flex: 1, fontWeight: 700, fontSize: '1rem' }}>Where to stay</Typography>
          <IconButton edge="end" onClick={onClose} aria-label="Close"><CloseRounded /></IconButton>
        </Toolbar>
        <Tabs value={cohort} onChange={(_, v) => setCohort(v)} variant="scrollable" scrollButtons="auto"
          sx={{ minHeight: 40, px: 1, '& .MuiTab-root': { minHeight: 40, fontWeight: 700, fontSize: '0.8rem', textTransform: 'none' } }}>
          {COHORTS.map((c) => <Tab key={c.key} value={c.key} label={c.label} />)}
        </Tabs>
      </AppBar>

      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25, overflowY: 'auto', flex: 1 }}>
        <ToggleButtonGroup exclusive size="small" value={tier} onChange={(_, v) => v && setTier(v)} color="primary" fullWidth>
          {TIERS.map((t) => <ToggleButton key={t.key} value={t.key} sx={{ fontWeight: 700, fontSize: '0.74rem', py: 0.4, textTransform: 'none' }}>{t.label}</ToggleButton>)}
        </ToggleButtonGroup>

        {err ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 4, fontSize: '0.85rem' }}>Couldn't load the hotel list.</Typography>
        ) : !hotels ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress size={26} /></Box>
        ) : list.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 4, fontSize: '0.85rem' }}>No stays in this budget yet for this cohort.</Typography>
        ) : (
          list.map((h) => <HotelCard key={h.placeId + h.name} h={h} />)
        )}
        <Typography sx={{ color: 'text.disabled', fontSize: '0.66rem', textAlign: 'center', mt: 0.5, px: 2 }}>
          Ratings &amp; reviews from Google · nightly "from" rates are indicative and vary by date/season.
        </Typography>
      </Box>
    </Dialog>
  );
}
