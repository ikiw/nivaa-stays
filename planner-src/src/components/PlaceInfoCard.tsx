// Floating info card for a tapped place: lazy Google photo + rating/reviews +
// short description, with "Show on map" and a Google Maps link.
import { Paper, Stack, Box, Typography, IconButton, CircularProgress, Button, Divider, Chip } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import LocalActivityRounded from '@mui/icons-material/LocalActivityRounded';
import { mapLink, track } from '../utils';
import { CAT_LABEL, SUB_LABEL, CAT_ICON } from '../constants';
import { detailPlanTip } from '../placeCopy';
import { usePlacePhoto } from './PlaceThumb';
import type { Place } from '../types';

interface PlaceInfoCardProps {
  place: Place;
  onClose: () => void;
  isMobile?: boolean;
  onShowOnMap?: () => void;
  context?: {
    time: string;
    stay: string;
    drive?: string;
  } | null;
}

export default function PlaceInfoCard({ place, onClose, isMobile, onShowOnMap, context }: PlaceInfoCardProps) {
  // Prefer the committed local image (static site asset — no Google call). Fall back to a
  // live fetch only when a place has no baked image (the same hook + cache backs the list
  // thumbnails). undefined = loading, null = nothing to show.
  const live = usePlacePhoto(place.img ? undefined : place.placeId, true);
  const photo = place.img ? { url: place.img, author: place.imgBy || '' } : live;

  const cat = (CAT_LABEL[place.cat] || place.cat || 'Start') + (place.sub ? ' · ' + (SUB_LABEL[place.sub] || place.sub) : '');
  const gmaps = place.placeId ? `https://www.google.com/maps/place/?q=place_id:${place.placeId}` : mapLink(place);
  const FallbackIcon = CAT_ICON[place.cat] || PlaceRounded;
  const photoUrl = photo && photo.url ? photo.url : null;     // a real photo URL once loaded
  const photoAuthor = (photo && photo.author) || '';
  return (
    <Paper elevation={10} sx={{ position: isMobile ? 'fixed' : 'absolute', left: isMobile ? 10 : 'auto', right: isMobile ? 10 : 14,
      top: isMobile ? 'auto' : 14, bottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 66px)' : 14, zIndex: isMobile ? 1250 : 5, p: 0,
      borderRadius: '18px', width: isMobile ? 'auto' : 370, maxHeight: isMobile ? '58dvh' : 'calc(100% - 28px)', overflow: 'hidden',
      bgcolor: 'rgba(20,22,28,0.98)', backdropFilter: 'blur(14px)', border: '1px solid', borderColor: 'divider', boxShadow: '0 18px 50px rgba(0,0,0,0.66)' }}>
      <Box sx={{ height: isMobile ? 150 : 170, position: 'relative', bgcolor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {photo === undefined ? <CircularProgress size={20} />
            : photoUrl ? <Box component="img" src={photoUrl} alt={place.name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <FallbackIcon sx={{ fontSize: 30, color: 'text.disabled' }} />}
        <IconButton size="small" onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(0,0,0,0.42)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.62)' } }} aria-label="Close"><CloseRounded sx={{ fontSize: 18 }} /></IconButton>
        <Typography sx={{ position: 'absolute', left: 10, bottom: 8, px: 0.8, py: 0.35, borderRadius: 999, bgcolor: 'rgba(0,0,0,0.56)', color: '#fff', fontSize: '0.68rem', fontWeight: 700 }}>{cat}</Typography>
      </Box>
      <Box sx={{ p: 1.5, overflowY: 'auto', maxHeight: isMobile ? 'calc(58dvh - 150px)' : 'calc(100% - 170px)' }}>
        <Stack spacing={1.05}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: '1.08rem', lineHeight: 1.18, letterSpacing: '-0.01em' }}>{place.name}</Typography>
            {place.rating ? (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.45 }}>
                <StarRounded sx={{ fontSize: 15, color: '#FBBF24' }} />
                <Typography sx={{ fontSize: '0.82rem', fontWeight: 800 }}>{place.rating}</Typography>
                {place.reviews ? <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>({Number(place.reviews).toLocaleString()} reviews)</Typography> : null}
              </Stack>
            ) : null}
          </Box>
          {context && (
            <Stack direction="row" spacing={0.7} useFlexGap flexWrap="wrap">
              <Chip size="small" label={context.time} sx={{ height: 24, fontWeight: 700 }} />
              <Chip size="small" variant="outlined" label={context.stay} sx={{ height: 24 }} />
              {context.drive && <Chip size="small" variant="outlined" label={context.drive} sx={{ height: 24 }} />}
            </Stack>
          )}
          {place.desc && <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', lineHeight: 1.5 }}>{place.desc}</Typography>}
          <Box sx={{ p: 1, borderRadius: '12px', bgcolor: 'rgba(91,138,199,0.14)', border: '1px solid rgba(91,138,199,0.28)' }}>
            <Typography sx={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'text.secondary', fontWeight: 800, mb: 0.4 }}>Plan tip</Typography>
            <Typography sx={{ fontSize: '0.78rem', lineHeight: 1.45, color: 'text.primary' }}>{detailPlanTip(place)}</Typography>
          </Box>
          <Divider />
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
            <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photoUrl && photoAuthor ? `Photo: ${photoAuthor} · Google` : 'Ratings via Google'}</Typography>
            <Chip size="small" label={place.cat} variant="outlined" sx={{ height: 22, fontSize: '0.66rem' }} />
          </Stack>
          <Stack direction="row" spacing={0.7} sx={{ pt: 0.1 }}>
            {onShowOnMap && <Button fullWidth size="small" variant="outlined" startIcon={<MapRounded sx={{ fontSize: 15 }} />} onClick={onShowOnMap} sx={{ px: 0.8, textTransform: 'none' }}>Show on map</Button>}
            <Button fullWidth size="small" variant="outlined" endIcon={<OpenInNewRounded sx={{ fontSize: 15 }} />} component="a" href={gmaps} target="_blank" rel="noopener" sx={{ px: 0.8, textTransform: 'none' }}>Google Maps</Button>
          </Stack>
          {place.book && (
            <Button fullWidth size="small" variant="contained" disableElevation
              startIcon={<LocalActivityRounded sx={{ fontSize: 16 }} />} endIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
              component="a" href={place.book.url} target="_blank" rel="noopener"
              onClick={() => track('place_book', { name: place.name })}
              sx={{ fontWeight: 700, borderRadius: '10px', bgcolor: '#FBBF24', color: '#1A1206', '&:hover': { bgcolor: '#F59E0B' } }}>
              {place.book.label}
            </Button>
          )}
        </Stack>
      </Box>
    </Paper>
  );
}
