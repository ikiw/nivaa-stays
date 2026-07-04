// A selectable place card in the picker — tap the body to add/remove it from the day
// (filled when added), with drive time from the start and a Google Maps shortcut.
import { Card, CardActionArea, Box, Typography, Tooltip, IconButton } from '@mui/material';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import StarRounded from '@mui/icons-material/StarRounded';
import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import { CAT_HEX } from '../constants';
import { mapLink } from '../utils';
import PlaceThumb from './PlaceThumb';
import type { Place } from '../types';

interface PlaceCardProps {
  place: Place;
  added: boolean;
  dm: number;      // drive minutes from the start
  dk: number;      // drive km from the start
  onToggle: () => void;
  featured?: boolean;
}

export default function PlaceCard({ place, added, dm, dk, onToggle, featured = false }: PlaceCardProps) {
  const cat = CAT_HEX[place.cat] || '#94A3B8';
  return (
    <Card variant="outlined" sx={{ borderColor: added ? 'rgba(230,195,90,0.58)' : 'rgba(255,255,255,0.075)', bgcolor: added ? 'rgba(230,195,90,0.08)' : '#111721', borderRadius: { xs: '13px', md: '12px' },
      transition: 'border-color .15s ease, box-shadow .15s ease, background-color .15s ease',
      '&:hover': { borderColor: 'rgba(230,195,90,0.46)', boxShadow: '0 8px 22px rgba(0,0,0,0.18)' }, '&:hover .map-ghost': { opacity: 1 } }}>
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        <CardActionArea onClick={(e) => { onToggle(); e.currentTarget.blur(); }} sx={{ flex: 1, minWidth: 0, p: { xs: 0.85, md: 0.72 }, display: 'flex', alignItems: 'center', gap: { xs: 0.95, md: 0.85 }, '& .MuiCardActionArea-focusHighlight': { opacity: 0 } }}>
          <Box sx={{ position: 'relative', flexShrink: 0 }}>
            <PlaceThumb place={place} size={64} width={76} height={58} tint={cat} radius="9px" />
            {featured && (
              <Box sx={{ position: 'absolute', top: 4, left: 4, display: 'inline-flex', alignItems: 'center', gap: 0.25, px: 0.5, py: '1px',
                borderRadius: 999, bgcolor: '#E6C35A', color: '#241A04', fontSize: '0.52rem', fontWeight: 900, boxShadow: '0 4px 12px rgba(0,0,0,0.25)' }}>
                <LocalFireDepartmentRounded sx={{ fontSize: 10 }} /> Popular
              </Box>
            )}
          </Box>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.55, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 850, fontSize: { xs: '0.9rem', md: '0.84rem' }, color: 'text.primary', lineHeight: 1.18, letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{place.name}</Typography>
              <Box component="span" sx={{ flexShrink: 0, px: 0.42, py: '1px', borderRadius: '5px', bgcolor: `${cat}22`, color: cat, fontSize: '0.5rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.035em' }}>{place.cat}</Box>
            </Box>
            {place.desc && <Typography sx={{ fontSize: { xs: '0.69rem', md: '0.66rem' }, color: 'text.secondary', mt: 0.22, lineHeight: 1.34 }}>{place.desc}</Typography>}
            <Box sx={{ mt: 0.42, display: 'flex', alignItems: 'center', gap: 0.72, fontSize: '0.65rem', fontWeight: 650, color: 'text.secondary', minWidth: 0 }}>
              {dm > 0 && <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.35, whiteSpace: 'nowrap' }}><DirectionsCarRounded sx={{ fontSize: 12.5 }} /> {dm} min · {dk.toFixed(1)} km</Box>}
              {place.rating && <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.3, whiteSpace: 'nowrap' }}><StarRounded sx={{ fontSize: 12.5, color: '#E6C35A' }} /><Box component="span" sx={{ color: 'text.primary', fontWeight: 850 }}>{place.rating}</Box>{place.reviews ? ` (${Number(place.reviews).toLocaleString()})` : ''}</Box>}
            </Box>
          </Box>
          <Tooltip title={added ? 'Remove from day' : 'Add to day'}>
            <Box component="span" sx={{ flexShrink: 0, display: 'flex', width: 28, height: 28, alignItems: 'center', justifyContent: 'center', borderRadius: '9px', border: '1px solid rgba(230,195,90,0.38)', color: '#E6C35A', bgcolor: added ? 'rgba(230,195,90,0.18)' : 'rgba(230,195,90,0.04)' }}>
              {added
                ? <CheckCircleRounded sx={{ fontSize: 20, color: '#E6C35A' }} />
                : <AddCircleOutlineRounded sx={{ fontSize: 20, color: '#E6C35A' }} />}
            </Box>
          </Tooltip>
        </CardActionArea>
        <Tooltip title="Open in Google Maps">
          <IconButton size="small" component="a" href={mapLink(place)} target="_blank" rel="noopener" className="map-ghost"
            sx={{ flexShrink: 0, alignSelf: 'center', mr: 0.5, color: 'text.secondary', opacity: { xs: 0.65, md: 0 }, transition: 'opacity .15s ease, color .15s ease', '&:hover': { opacity: 1, color: 'primary.light' } }}>
            <OpenInNewRounded sx={{ fontSize: 17 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </Card>
  );
}
