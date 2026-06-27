// Floating info card for a tapped place: lazy Google photo + rating/reviews +
// short description, with "Show on map" and a Google Maps link.
import { useState, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Paper, Stack, Box, Typography, IconButton, CircularProgress, Button } from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import MapRounded from '@mui/icons-material/MapRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import LocalActivityRounded from '@mui/icons-material/LocalActivityRounded';
import { photoCache, mapLink, track } from '../utils';
import { CAT_LABEL, SUB_LABEL, CAT_ICON } from '../constants';
import type { Place } from '../types';

type Photo = { url: string; author: string };

interface PlaceInfoCardProps {
  place: Place;
  onClose: () => void;
  isMobile?: boolean;
  onShowOnMap?: () => void;
}

export default function PlaceInfoCard({ place, onClose, isMobile, onShowOnMap }: PlaceInfoCardProps) {
  const placesLib = useMapsLibrary('places');
  // photo: a Photo once resolved, null when there's no place, undefined while loading.
  const [photo, setPhoto] = useState<Photo | null | undefined>(() => (place.placeId ? photoCache.get(place.placeId) : null));
  useEffect(() => {
    const placeId = place.placeId;                 // capture so narrowing survives the async closure
    if (!placeId) { setPhoto(null); return; }
    if (photoCache.has(placeId)) { setPhoto(photoCache.get(placeId)); return; }
    setPhoto(undefined);                           // loading
    if (!placesLib) return;
    let alive = true;
    (async () => {
      let res: Photo = { url: '', author: '' };
      try {
        const pl = new placesLib.Place({ id: placeId });
        await pl.fetchFields({ fields: ['photos'] });
        const ph = pl.photos && pl.photos[0];
        if (ph && ph.getURI) res = { url: ph.getURI({ maxWidth: 400 }), author: (ph.authorAttributions && ph.authorAttributions[0] && ph.authorAttributions[0].displayName) || '' };
      } catch { /* Places API not enabled / no photo — fall back to icon */ }
      photoCache.set(placeId, res);
      if (alive) setPhoto(res);
    })();
    return () => { alive = false; };
  }, [placesLib, place.placeId]);

  const cat = (CAT_LABEL[place.cat] || place.cat || 'Start') + (place.sub ? ' · ' + (SUB_LABEL[place.sub] || place.sub) : '');
  const gmaps = place.placeId ? `https://www.google.com/maps/place/?q=place_id:${place.placeId}` : mapLink(place);
  const FallbackIcon = CAT_ICON[place.cat] || PlaceRounded;
  const photoUrl = photo && photo.url ? photo.url : null;     // a real photo URL once loaded
  const photoAuthor = (photo && photo.author) || '';
  return (
    <Paper elevation={10} sx={{ position: isMobile ? 'fixed' : 'absolute', left: isMobile ? 10 : 12, right: isMobile ? 10 : 12,
      bottom: isMobile ? 'calc(env(safe-area-inset-bottom) + 66px)' : 12, zIndex: isMobile ? 1250 : 5, p: 1.25, borderRadius: '14px',
      maxWidth: isMobile ? 'none' : 380, mx: isMobile ? 0 : 'auto', bgcolor: 'rgba(20,22,28,0.98)', backdropFilter: 'blur(12px)', border: '1px solid', borderColor: 'divider', boxShadow: '0 14px 40px rgba(0,0,0,0.65)' }}>
      <Stack direction="row" spacing={1.25}>
        <Box sx={{ width: 76, height: 76, borderRadius: '10px', flexShrink: 0, overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {photo === undefined ? <CircularProgress size={20} />
            : photoUrl ? <Box component="img" src={photoUrl} alt={place.name} loading="lazy" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <FallbackIcon sx={{ fontSize: 30, color: 'text.disabled' }} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={0.5}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.2 }}>{place.name}</Typography>
            <IconButton size="small" onClick={onClose} sx={{ mt: -0.6, mr: -0.6 }} aria-label="Close"><CloseRounded sx={{ fontSize: 18 }} /></IconButton>
          </Stack>
          {place.rating ? (
            <Stack direction="row" spacing={0.4} alignItems="center" sx={{ mt: 0.2 }}>
              <StarRounded sx={{ fontSize: 15, color: '#FBBF24' }} />
              <Typography sx={{ fontSize: '0.82rem', fontWeight: 700 }}>{place.rating}</Typography>
              {place.reviews ? <Typography sx={{ fontSize: '0.76rem', color: 'text.secondary' }}>({Number(place.reviews).toLocaleString()} reviews)</Typography> : null}
            </Stack>
          ) : null}
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.2 }}>{cat}</Typography>
        </Box>
      </Stack>
      {place.desc && <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.85, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{place.desc}</Typography>}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1} sx={{ mt: 0.85 }}>
        <Typography sx={{ fontSize: '0.62rem', color: 'text.disabled', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{photoUrl && photoAuthor ? `Photo: ${photoAuthor} · Google` : 'Ratings via Google'}</Typography>
        <Stack direction="row" spacing={0.5} sx={{ flexShrink: 0 }}>
          {onShowOnMap && <Button size="small" startIcon={<MapRounded sx={{ fontSize: 15 }} />} onClick={onShowOnMap} sx={{ px: 0.6 }}>Map</Button>}
          <Button size="small" endIcon={<OpenInNewRounded sx={{ fontSize: 15 }} />} component="a" href={gmaps} target="_blank" rel="noopener" sx={{ px: 0.6 }}>Google Maps</Button>
        </Stack>
      </Stack>
      {place.book && (
        <Button fullWidth size="small" variant="contained" disableElevation
          startIcon={<LocalActivityRounded sx={{ fontSize: 16 }} />} endIcon={<OpenInNewRounded sx={{ fontSize: 14 }} />}
          component="a" href={place.book.url} target="_blank" rel="noopener"
          onClick={() => track('place_book', { name: place.name })}
          sx={{ mt: 0.9, fontWeight: 700, borderRadius: '10px', bgcolor: '#FBBF24', color: '#1A1206', '&:hover': { bgcolor: '#F59E0B' } }}>
          {place.book.label}
        </Button>
      )}
    </Paper>
  );
}
