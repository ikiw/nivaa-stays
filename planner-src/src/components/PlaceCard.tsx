// A selectable place card in the picker — tap the body to add/remove it from the day
// (filled when added), with drive time from the start and a Google Maps shortcut.
import { Card, CardActionArea, Box, Typography, Tooltip, IconButton } from '@mui/material';
import DirectionsCarRounded from '@mui/icons-material/DirectionsCarRounded';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import AddCircleOutlineRounded from '@mui/icons-material/AddCircleOutlineRounded';
import OpenInNewRounded from '@mui/icons-material/OpenInNewRounded';
import { CAT_ICON, CAT_HEX } from '../constants';
import { mapLink } from '../utils';
import type { Place } from '../types';

interface PlaceCardProps {
  place: Place;
  added: boolean;
  dm: number;      // drive minutes from the start
  dk: number;      // drive km from the start
  onToggle: () => void;
}

export default function PlaceCard({ place, added, dm, dk, onToggle }: PlaceCardProps) {
  const Icon = CAT_ICON[place.cat];
  const cat = CAT_HEX[place.cat] || '#94A3B8';
  return (
    <Card variant="outlined" sx={{ borderColor: added ? 'primary.main' : 'rgba(255,255,255,0.10)', bgcolor: added ? 'rgba(33,150,243,0.16)' : 'background.paper', transition: 'border-color .15s ease, box-shadow .15s ease', '&:hover': { borderColor: 'primary.main', boxShadow: '0 0 0 1px rgba(33,150,243,0.5), 0 8px 22px rgba(0,0,0,0.45)' }, '&:hover .map-ghost': { opacity: 1 } }}>
      <Box sx={{ display: 'flex', alignItems: 'stretch' }}>
        <CardActionArea onClick={(e) => { onToggle(); e.currentTarget.blur(); }} sx={{ flex: 1, minWidth: 0, p: 1.25, display: 'flex', alignItems: 'center', gap: 1.25, '& .MuiCardActionArea-focusHighlight': { opacity: 0 } }}>
          <Box sx={{ width: 38, height: 38, borderRadius: '10px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: `${cat}22`, color: cat }}>
            <Icon sx={{ fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: '0.88rem', color: 'text.primary', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{place.name}</Typography>
            {place.desc && <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary', mt: 0.2, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{place.desc}</Typography>}
            {dm > 0 && (
              <Box sx={{ mt: 0.4, display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '0.7rem', fontWeight: 600, color: 'text.secondary' }}>
                <DirectionsCarRounded sx={{ fontSize: 13 }} /> {dm} min · {dk.toFixed(1)} km
              </Box>
            )}
          </Box>
          <Tooltip title={added ? 'Remove from day' : 'Add to day'}>
            <Box component="span" sx={{ flexShrink: 0, display: 'flex' }}>
              {added
                ? <CheckCircleRounded sx={{ fontSize: 25, color: 'primary.main' }} />
                : <AddCircleOutlineRounded sx={{ fontSize: 25, color: 'text.secondary' }} />}
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
