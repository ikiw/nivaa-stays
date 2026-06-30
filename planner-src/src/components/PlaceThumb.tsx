// Lazy Google place thumbnail. The photo is fetched from the Places API ONLY when the
// thumb scrolls into view (IntersectionObserver) AND its category is expanded — collapsed
// picker sections unmount their cards (Collapse unmountOnExit), so they never mount a thumb
// and never fetch. Shares the session photoCache with PlaceInfoCard, so each place's photo
// is fetched at most once per session whether it's seen in the list or the info card.
import { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { Box } from '@mui/material';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import { photoCache } from '../utils';
import { CAT_ICON } from '../constants';
import type { Place } from '../types';

export type Photo = { url: string; author: string };

/** Resolve a Google place photo lazily. Only calls the Places API when `enabled` is true
 *  (e.g. the thumb is in the viewport). Returns undefined while loading, null when there's
 *  no place id, or a Photo (url '' = fetched but no photo) once resolved. */
export function usePlacePhoto(placeId: string | undefined, enabled: boolean): Photo | null | undefined {
  const placesLib = useMapsLibrary('places');
  const [photo, setPhoto] = useState<Photo | null | undefined>(
    () => (!placeId ? null : photoCache.get(placeId) ?? undefined),
  );
  useEffect(() => {
    if (!placeId) { setPhoto(null); return; }
    const hit = photoCache.get(placeId);
    if (hit) { setPhoto(hit); return; }
    if (!enabled || !placesLib) return;          // hold off until in view + the lib is ready
    setPhoto(undefined);                         // loading
    let alive = true;
    (async () => {
      let res: Photo = { url: '', author: '' };
      try {
        const pl = new placesLib.Place({ id: placeId });
        await pl.fetchFields({ fields: ['photos'] });
        const ph = pl.photos && pl.photos[0];
        if (ph && ph.getURI) res = { url: ph.getURI({ maxWidth: 400 }), author: (ph.authorAttributions && ph.authorAttributions[0] && ph.authorAttributions[0].displayName) || '' };
      } catch { /* Places API not enabled / no photo — fall back to the icon */ }
      photoCache.set(placeId, res);
      if (alive) setPhoto(res);
    })();
    return () => { alive = false; };
  }, [placesLib, placeId, enabled]);
  return photo;
}

interface PlaceThumbProps {
  place: Place;
  size: number;          // px (square)
  tint: string;          // icon colour + tinted backing while the photo loads / when absent
  radius?: string;
  iconSize?: number;
}

const frame = (size: number, radius: string, tint: string, hasImg: boolean) => ({
  width: size, height: size, borderRadius: radius, flexShrink: 0, overflow: 'hidden',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  bgcolor: hasImg ? 'transparent' : `${tint}22`, color: tint,
});

/** Square thumbnail. Prefers the committed local image (static, served as a site asset —
 *  zero Google calls); falls back to a lazily-fetched Google photo for the few places
 *  without a baked image, and to the category icon when there's nothing at all. */
export default function PlaceThumb({ place, size, tint, radius = '10px', iconSize = 20 }: PlaceThumbProps) {
  const Icon = CAT_ICON[place.cat] || PlaceRounded;
  if (place.img) {
    return (
      <Box sx={frame(size, radius, tint, true)}>
        <Box component="img" src={place.img} alt={place.name} loading="lazy" decoding="async"
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </Box>
    );
  }
  return <LiveThumb place={place} size={size} tint={tint} radius={radius} icon={<Icon sx={{ fontSize: iconSize }} />} />;
}

/** Fallback: live Google fetch, gated to the viewport so it never calls until on screen. */
function LiveThumb({ place, size, tint, radius, icon }: { place: Place; size: number; tint: string; radius: string; icon: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    if (inView) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setInView(true); io.disconnect(); }
    }, { rootMargin: '150px' });                 // warm up just before it scrolls into view
    io.observe(el);
    return () => io.disconnect();
  }, [inView]);
  const photo = usePlacePhoto(place.placeId, inView);
  const url = photo && photo.url ? photo.url : null;
  return (
    <Box ref={ref} sx={frame(size, radius, tint, !!url)}>
      {url
        ? <Box component="img" src={url} alt={place.name} loading="lazy" decoding="async" sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        : icon}
    </Box>
  );
}
