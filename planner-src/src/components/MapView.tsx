// The map pane: the live RouteMap once engaged, else a "load map" teaser (a Map mount
// is a billed Dynamic-Maps load, so it's deferred until the visitor interacts).
import { Box, Paper, Stack, Typography, Button } from '@mui/material';
import MapRounded from '@mui/icons-material/MapRounded';
import PlaceRounded from '@mui/icons-material/PlaceRounded';
import RouteMap from './RouteMap';
import type { Planner } from '../usePlanner';
import { ACTIVE } from '../theme/tokens';
import { PICK_ORDER } from '../constants';

export default function MapView({ planner, showBrowsePlaces = false }: { planner: Planner; showBrowsePlaces?: boolean }) {
  const { data, start, mapStops, selectedIdx, stops, mapActive, activateMap, selectPlace, isMobile, filter, byCat, subFilter } = planner;
  if (!data) return null;
  const browsePlaceIndices = showBrowsePlaces && !stops.length
    ? (filter === 'All'
        ? PICK_ORDER.flatMap(cat => byCat[cat] || [])
        : (byCat[filter] || []).filter(i => subFilter === 'All' || data.places[i]?.sub === subFilter))
    : undefined;
  return (
    <Box sx={{ height: '100%', minHeight: 0, borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)', position: 'relative', bgcolor: 'background.default',
      boxShadow: '0 22px 70px rgba(0,0,0,0.26), inset 0 1px 0 rgba(255,255,255,0.04)' }}>
      {mapActive || (!isMobile && !stops.length) ? (
        <>
          <RouteMap data={data} start={start} stops={mapStops} selected={selectedIdx} onSelect={(i) => selectPlace(i, 'map')} browseCatalog={showBrowsePlaces && !stops.length} browsePlaceIndices={browsePlaceIndices} />
          {!stops.length && (
            <Paper sx={{ position: 'absolute', bottom: 18, left: 18, zIndex: 2, px: 1.4, py: 0.75, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 0.8, bgcolor: 'rgba(13,18,27,0.82)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 6px 22px rgba(0,0,0,0.18)', color: 'text.secondary', fontSize: '0.78rem', maxWidth: 'calc(100% - 32px)', pointerEvents: 'none' }}>
              <PlaceRounded sx={{ fontSize: 18, flexShrink: 0 }} /> Add places to start building your itinerary.
            </Paper>
          )}
        </>
      ) : (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', p: { xs: 2.5, md: 3.5 },
          backgroundImage: (ACTIVE.mode === 'light'
            ? 'linear-gradient(0deg, ' + ACTIVE.bg + 'D9 0%, ' + ACTIVE.bg + '40 32%, ' + ACTIVE.bg + '00 60%)'
            : 'linear-gradient(0deg, ' + ACTIVE.bg + 'EB 0%, ' + ACTIVE.bg + '59 38%, ' + ACTIVE.bg + '00 72%)') + ', url(' + ACTIVE.bgImage + ')',
          backgroundSize: 'cover', backgroundPosition: 'center' }}>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ gap: 1.5 }}>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <MapRounded sx={{ fontSize: 20, color: 'primary.light' }} /> {isMobile ? 'Pick places to map your day' : 'Your live map appears here'}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mt: 0.4 }}>
                Add a place or ask the planner — the map and driving route load the moment you start.
              </Typography>
            </Box>
            <Button variant="contained" size="small" startIcon={<MapRounded />} onClick={() => activateMap('load_button')} sx={{ flexShrink: 0 }}>Load map now</Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
}
