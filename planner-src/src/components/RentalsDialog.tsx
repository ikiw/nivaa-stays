// "Rentals" overlay — browse-only bike & car rental directory, separate from the itinerary.
// Opened from the top-bar Rentals button; lazily fetches data/pondicherry-rentals.json.
// One flat list per vehicle type (no cohorts/price-tiers); ranked by a review-weighted score.
import { useState, useEffect, useMemo } from 'react';
import { Dialog, AppBar, Toolbar, Box, Typography, IconButton, ToggleButtonGroup, ToggleButton, Stack, Chip, Button, CircularProgress } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import TwoWheelerRounded from '@mui/icons-material/TwoWheelerRounded';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import PhoneRounded from '@mui/icons-material/PhoneRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import { track } from '../utils';

interface Rental {
  name: string; slug: string; vtype: 'bike' | 'car'; dailyFrom: number; area: string;
  placeId: string; rating: number | null; reviews: number | null; phone: string; mapsUrl: string; img: string; imgBy: string;
}

const TYPES = [
  { key: 'bike', label: 'Bikes', Icon: TwoWheelerRounded },
  { key: 'car', label: 'Cars', Icon: DirectionsCarRounded },
];

// Bayesian shrinkage toward 4.0 (n=30) so a 5.0 with 60 reviews can't outrank a 4.9 with 2,500.
const PRIOR_N = 30, PRIOR_M = 4.0;
const score = (r: Rental) => ((r.reviews || 0) * (r.rating || 0) + PRIOR_N * PRIOR_M) / ((r.reviews || 0) + PRIOR_N);
const inr = (n: number) => '₹' + n.toLocaleString('en-IN');
// Trim SEO-stuffed Google business names ("X - SELF DRIVE CAR RENTAL | ...") to the real name.
const cleanName = (n: string) => n.split(/\s+[-–|]\s+|\s+\/\s+/)[0].trim() || n;

function RentalCard({ r }: { r: Rental }) {
  const Fallback = r.vtype === 'car' ? DirectionsCarRounded : TwoWheelerRounded;
  return (
    <Box sx={{ display: 'flex', gap: 1.25, p: 1.25, borderRadius: '14px', border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
      <Box sx={{ width: 84, height: 84, borderRadius: '10px', flexShrink: 0, overflow: 'hidden', bgcolor: 'action.hover', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'text.disabled' }}>
        {r.img
          ? <Box component="img" src={r.img} alt={cleanName(r.name)} loading="lazy" decoding="async" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <Fallback sx={{ fontSize: 30 }} />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: '0.92rem', color: 'text.primary', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cleanName(r.name)}</Typography>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mt: 0.3, flexWrap: 'wrap', rowGap: 0.2 }}>
          {r.rating != null && (
            <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
              <StarRounded sx={{ fontSize: 14, color: '#FBBF24' }} />
              <Box component="span" sx={{ fontWeight: 700, fontSize: '0.8rem', color: 'text.primary' }}>{r.rating}</Box>
              {r.reviews != null && <Box component="span" sx={{ fontSize: '0.74rem', color: 'text.secondary' }}>({r.reviews.toLocaleString('en-IN')})</Box>}
            </Box>
          )}
          <Box component="span" sx={{ color: 'text.disabled', fontSize: '0.74rem' }}>·</Box>
          <Chip label={'from ' + inr(r.dailyFrom) + '/day'} size="small" variant="outlined" sx={{ height: 19, fontSize: '0.68rem', fontWeight: 700, borderColor: 'divider' }} />
        </Stack>
        <Typography sx={{ mt: 0.3, fontSize: '0.74rem', color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.4, minWidth: 0 }}>
          <PlaceRounded sx={{ fontSize: 13, flexShrink: 0 }} />
          <Box component="span" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.area}</Box>
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 0.6 }}>
          {r.phone && (
            <Button size="small" variant="contained" disableElevation startIcon={<PhoneRounded sx={{ fontSize: 15 }} />}
              component="a" href={'tel:' + r.phone.replace(/\s+/g, '')} onClick={() => track('rental_click', { name: r.name, action: 'call' })}
              sx={{ px: 1, py: 0.2, fontSize: '0.72rem', fontWeight: 700, bgcolor: '#E6C35A', color: '#2A2100', boxShadow: 'none', '&:hover': { bgcolor: '#D9B441', boxShadow: 'none' } }}>
              Call
            </Button>
          )}
          <Button size="small" variant="outlined" endIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
            component="a" href={r.mapsUrl} target="_blank" rel="noopener" onClick={() => track('rental_click', { name: r.name, action: 'maps' })}
            sx={{ px: 1, py: 0.2, fontSize: '0.72rem', fontWeight: 700 }}>
            Maps
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}

interface RentalsDialogProps {
  open: boolean;
  onClose: () => void;
  isMobile?: boolean;
}

export default function RentalsDialog({ open, onClose, isMobile }: RentalsDialogProps) {
  const [rentals, setRentals] = useState<Rental[] | null>(null);
  const [err, setErr] = useState(false);
  const [vtype, setVtype] = useState<'bike' | 'car'>('bike');

  useEffect(() => {
    if (!open || rentals) return;
    fetch('/data/pondicherry-rentals.json')
      .then((r) => { if (!r.ok) throw new Error('rentals'); return r.json(); })
      .then((d) => setRentals(d.rentals || []))
      .catch(() => setErr(true));
  }, [open, rentals]);

  useEffect(() => { if (open) track('rentals_open', {}); }, [open]);

  const list = useMemo(() => {
    if (!rentals) return [];
    return rentals.filter((r) => r.vtype === vtype && r.rating != null).sort((a, b) => score(b) - score(a)).slice(0, 10);
  }, [rentals, vtype]);

  return (
    <Dialog fullScreen={isMobile} open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: isMobile ? 0 : '16px', backgroundImage: 'none', bgcolor: 'background.default', height: isMobile ? '100%' : '88vh' } }}>
      <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'background.paper', color: 'text.primary', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <TwoWheelerRounded sx={{ fontSize: 20, color: 'primary.main' }} />
          <Typography sx={{ flex: 1, fontWeight: 700, fontSize: '1rem' }}>Bike &amp; car rentals</Typography>
          <IconButton edge="end" onClick={onClose} aria-label="Close"><CloseRounded /></IconButton>
        </Toolbar>
      </AppBar>

      <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.25, overflowY: 'auto', flex: 1 }}>
        <ToggleButtonGroup exclusive size="small" value={vtype} onChange={(_, v) => v && setVtype(v)} color="primary" fullWidth>
          {TYPES.map((t) => <ToggleButton key={t.key} value={t.key} sx={{ fontWeight: 700, fontSize: '0.78rem', py: 0.5, textTransform: 'none', gap: 0.6 }}><t.Icon sx={{ fontSize: 17 }} />{t.label}</ToggleButton>)}
        </ToggleButtonGroup>

        {err ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 4, fontSize: '0.85rem' }}>Couldn't load the rental list.</Typography>
        ) : !rentals ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress size={26} /></Box>
        ) : list.length === 0 ? (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 4, fontSize: '0.85rem' }}>No {vtype} rentals found.</Typography>
        ) : (
          list.map((r) => <RentalCard key={r.placeId} r={r} />)
        )}
        <Typography sx={{ color: 'text.disabled', fontSize: '0.66rem', textAlign: 'center', mt: 0.5, px: 2 }}>
          Ratings &amp; reviews from Google · daily "from" rates are indicative — confirm on the call.
        </Typography>
      </Box>
    </Dialog>
  );
}
